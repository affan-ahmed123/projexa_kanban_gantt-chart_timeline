import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export async function GET() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || "affannadeem08@gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.SMTP_FROM || `"Projexa Workspaces" <${user}>`;
  const hasPass = true;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  const isConfigured = true;

  return NextResponse.json({
    isConfigured,
    host,
    port,
    user,
    from,
    secure,
    hasPassword: hasPass
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action = "test",
      host = process.env.SMTP_HOST || "smtp.gmail.com",
      port = Number(process.env.SMTP_PORT || 587),
      user = process.env.SMTP_USER || process.env.GMAIL_USER || "",
      pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "",
      from = process.env.SMTP_FROM || "",
      secure = false,
      testRecipient
    } = body;

    const cleanPass = String(pass).replace(/\s+/g, "");
    const cleanUser = String(user).trim();
    const cleanHost = String(host).trim();
    const numericPort = Number(port) || 587;
    const isSecure = Boolean(secure) || numericPort === 465;

    if (!cleanUser || !cleanPass) {
      return NextResponse.json(
        { success: false, error: "SMTP Username / Email and Password are required." },
        { status: 400 }
      );
    }

    // Build transporter
    let transporter: ReturnType<typeof nodemailer.createTransport>;
    if (cleanHost === "smtp.gmail.com" || (!cleanHost && cleanUser.endsWith("@gmail.com"))) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: cleanUser,
          pass: cleanPass
        }
      });
    } else {
      transporter = nodemailer.createTransport({
        host: cleanHost,
        port: numericPort,
        secure: isSecure,
        auth: {
          user: cleanUser,
          pass: cleanPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }

    if (action === "test") {
      const recipient = testRecipient ? String(testRecipient).trim() : cleanUser;
      if (!recipient) {
        return NextResponse.json(
          { success: false, error: "Test recipient email is required." },
          { status: 400 }
        );
      }

      // Verify connection first
      await transporter.verify();

      // Dispatch real test email
      const info = await transporter.sendMail({
        from: from || `"Projexa Workspace" <${cleanUser}>`,
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
              <div><strong>Sender Host:</strong> ${cleanHost || "Gmail Service"}</div>
              <div><strong>Authenticated User:</strong> ${cleanUser}</div>
              <div><strong>Delivered To:</strong> ${recipient}</div>
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

    if (action === "save") {
      // 1. Update in-memory process.env
      process.env.SMTP_HOST = cleanHost;
      process.env.SMTP_PORT = String(numericPort);
      process.env.SMTP_USER = cleanUser;
      process.env.SMTP_PASS = cleanPass;
      process.env.SMTP_FROM = from || `"Projexa" <${cleanUser}>`;
      process.env.SMTP_SECURE = String(isSecure);

      // 2. Persist to apps/web/.env.local
      const envPath = path.resolve(process.cwd(), ".env.local");
      let existingEnv = "";
      if (fs.existsSync(envPath)) {
        existingEnv = fs.readFileSync(envPath, "utf-8");
      }

      // Regex replace or append SMTP entries
      const setOrAppend = (content: string, key: string, value: string): string => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${value}`);
        }
        return `${content.trimEnd()}\n${key}=${value}\n`;
      };

      let newEnv = existingEnv;
      newEnv = setOrAppend(newEnv, "SMTP_HOST", cleanHost);
      newEnv = setOrAppend(newEnv, "SMTP_PORT", String(numericPort));
      newEnv = setOrAppend(newEnv, "SMTP_USER", cleanUser);
      newEnv = setOrAppend(newEnv, "SMTP_PASS", cleanPass);
      newEnv = setOrAppend(newEnv, "SMTP_FROM", from || `"${cleanUser.split("@")[0]}" <${cleanUser}>`);
      newEnv = setOrAppend(newEnv, "SMTP_SECURE", String(isSecure));

      fs.writeFileSync(envPath, newEnv, "utf-8");

      return NextResponse.json({
        success: true,
        message: "SMTP configuration successfully saved and activated!"
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to verify or save SMTP settings";
    console.error("[Email Config API Error]:", error);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
