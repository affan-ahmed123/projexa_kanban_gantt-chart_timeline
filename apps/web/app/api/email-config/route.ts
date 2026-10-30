import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Helper: Escape HTML to prevent injection in test email dispatch
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Allowlist hostname validation for dev-only save action to prevent SSRF
function isAllowedHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (
    !h ||
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.|0\.0\.0\.0)/.test(h) ||
    h === "::1"
  ) {
    return false;
  }
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(h);
}

const ALLOWED_PORTS = new Set([25, 465, 587, 2525]);

const ALLOWED_ENV_KEYS = new Set([
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "SMTP_SECURE"
]);

// Strip newlines to prevent header and .env injection
function sanitizeEnvValue(val: unknown): string {
  return String(val ?? "").replace(/[\r\n]/g, "").trim();
}

// Constant-time token verification using timingSafeEqual
function verifyAdminKey(providedToken: string, expectedKey: string): boolean {
  const hProvided = crypto.createHash("sha256").update(providedToken).digest();
  const hExpected = crypto.createHash("sha256").update(expectedKey).digest();
  return crypto.timingSafeEqual(hProvided, hExpected);
}

// GET: Returns ONLY { isConfigured: boolean }
export async function GET() {
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || "").trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").trim();
  const isConfigured = Boolean(user && pass);

  return NextResponse.json({
    isConfigured
  });
}

export async function POST(request: Request) {
  // 1. In production, POST is completely disabled (405)
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "POST method is disabled in production. SMTP configuration is managed via server environment variables." },
      { status: 405 }
    );
  }

  // 2. In development, verify SMTP_ADMIN_KEY from server env (503 if not set)
  const expectedAdminKey = process.env.SMTP_ADMIN_KEY;
  if (!expectedAdminKey || expectedAdminKey.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "SMTP_ADMIN_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  // Authorization: Bearer header verification
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Missing or invalid Bearer authorization token." },
      { status: 401 }
    );
  }

  const providedToken = authHeader.slice(7).trim();
  if (!verifyAdminKey(providedToken, expectedAdminKey.trim())) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid admin key." },
      { status: 401 }
    );
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }
    const action = body.action || "test";

    // 3 & 4. "test" action: Read credentials ONLY from server env variables; recipient is strictly configured SMTP_USER
    if (action === "test") {
      const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
      const smtpPort = Number(process.env.SMTP_PORT || 587);
      const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || "").trim();
      const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";
      const smtpPass = rawPass.replace(/\s+/g, "");
      const smtpFrom = (process.env.SMTP_FROM || "").trim();
      const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

      if (!smtpUser || !smtpPass) {
        return NextResponse.json(
          { success: false, error: "SMTP credentials are not configured in server environment." },
          { status: 400 }
        );
      }

      // Recipient is strictly the configured SMTP_USER
      const recipient = smtpUser;

      let transporter: ReturnType<typeof nodemailer.createTransport>;
      if (smtpHost === "smtp.gmail.com" || (!smtpHost && smtpUser.endsWith("@gmail.com"))) {
        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
      } else {
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
      }

      await transporter.verify();

      const safeHost = escapeHtml(smtpHost || "Gmail Service");
      const safeUser = escapeHtml(smtpUser);
      const safeRecipient = escapeHtml(recipient);

      const info = await transporter.sendMail({
        from: smtpFrom || `"Projexa Workspace" <${smtpUser}>`,
        to: recipient,
        subject: "📬 Projexa Email Service Test — Verification Successful",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="padding: 12px 16px; background: #0f172a; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 700;">Projexa Email Verification</h2>
            </div>
            <p style="font-size: 15px; color: #334155; line-height: 1.5;">
              Congratulations! Your SMTP email server connection has been <strong>successfully verified</strong>.
            </p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
              All workspace invitations dispatched to colleagues will now land directly in their inbox with the one-click <strong>"Accept Invitation & Join Workspace"</strong> button.
            </p>
            <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b;">
              <div><strong>Sender Host:</strong> ${safeHost}</div>
              <div><strong>Authenticated User:</strong> ${safeUser}</div>
              <div><strong>Delivered To:</strong> ${safeRecipient}</div>
            </div>
          </div>
        `,
        text: `Projexa Email Verification Successful!\n\nYour SMTP email server is working properly. Invitations will now be sent directly to your colleagues' inboxes.`
      });

      return NextResponse.json({
        success: true,
        message: `Test email successfully delivered to ${recipient}!`,
        messageId: info.messageId
      });
    }

    // 7. Dev-only "save" action: strictly validated host/port and newline stripped
    if (action === "save") {
      const cleanHost = sanitizeEnvValue(body.host);
      const cleanPort = Number(body.port) || 587;
      const cleanUser = sanitizeEnvValue(body.user);
      const cleanPass = sanitizeEnvValue(body.pass).replace(/\s+/g, "");
      const cleanFrom = sanitizeEnvValue(body.from);
      const cleanSecure = String(Boolean(body.secure) || cleanPort === 465);

      if (!cleanUser || !cleanPass) {
        return NextResponse.json(
          { success: false, error: "SMTP Username / Email and Password are required." },
          { status: 400 }
        );
      }

      if (cleanHost && !isAllowedHost(cleanHost)) {
        return NextResponse.json(
          { success: false, error: "Invalid host address. Internal/private hosts and URLs are rejected." },
          { status: 400 }
        );
      }

      if (!ALLOWED_PORTS.has(cleanPort)) {
        return NextResponse.json(
          { success: false, error: `Invalid port. Allowed ports are: ${Array.from(ALLOWED_PORTS).join(", ")}` },
          { status: 400 }
        );
      }

      // Update in-memory process.env
      process.env.SMTP_HOST = cleanHost;
      process.env.SMTP_PORT = String(cleanPort);
      process.env.SMTP_USER = cleanUser;
      process.env.SMTP_PASS = cleanPass;
      process.env.SMTP_FROM = cleanFrom || `"Projexa" <${cleanUser}>`;
      process.env.SMTP_SECURE = cleanSecure;

      // Safe update to .env.local
      const appEnvPath = path.resolve(process.cwd(), ".env.local");
      const subEnvPath = path.resolve(process.cwd(), "apps/web/.env.local");
      const envPath = fs.existsSync(appEnvPath) ? appEnvPath : subEnvPath;

      let existingEnv = "";
      if (fs.existsSync(envPath)) {
        existingEnv = fs.readFileSync(envPath, "utf-8");
      }

      const updates: Record<string, string> = {
        SMTP_HOST: cleanHost,
        SMTP_PORT: String(cleanPort),
        SMTP_USER: cleanUser,
        SMTP_PASS: cleanPass,
        SMTP_FROM: cleanFrom || `"${cleanUser.split("@")[0]}" <${cleanUser}>`,
        SMTP_SECURE: cleanSecure
      };

      const lines = existingEnv.split(/\r?\n/);
      for (const [key, val] of Object.entries(updates)) {
        if (!ALLOWED_ENV_KEYS.has(key)) continue;
        const safeVal = sanitizeEnvValue(val);
        const lineIdx = lines.findIndex((l) => l.startsWith(`${key}=`));
        if (lineIdx !== -1) {
          lines[lineIdx] = `${key}=${safeVal}`;
        } else {
          lines.push(`${key}=${safeVal}`);
        }
      }

      fs.writeFileSync(envPath, lines.join("\n"), "utf-8");

      return NextResponse.json({
        success: true,
        message: "SMTP configuration successfully saved and activated!"
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    // 10. Only log error.message, never credentials or full error object
    const errorMsg = error instanceof Error ? error.message : "Failed to verify or save SMTP settings";
    console.error("[Email Config API Error]:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
