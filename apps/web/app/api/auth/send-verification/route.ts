import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { saveVerificationCode } from "../verification-store";

// Rate limiting in-memory store
const globalRateLimit = globalThis as unknown as {
  __emailRateLimit?: Map<string, number>;
  __ipRateLimit?: Map<string, number[]>;
};

if (!globalRateLimit.__emailRateLimit) {
  globalRateLimit.__emailRateLimit = new Map<string, number>();
}
if (!globalRateLimit.__ipRateLimit) {
  globalRateLimit.__ipRateLimit = new Map<string, number[]>();
}

const emailRateLimit = globalRateLimit.__emailRateLimit;
const ipRateLimit = globalRateLimit.__ipRateLimit;

const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "127.0.0.1";
};

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export async function POST(request: Request) {
  try {
    const now = Date.now();
    const clientIp = getClientIp(request);
    const oneHourAgo = now - 60 * 60 * 1000;

    // Rate limit: Max 10 requests per hour per IP
    const ipTimestamps = (ipRateLimit.get(clientIp) || []).filter((ts) => ts > oneHourAgo);
    if (ipTimestamps.length >= 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests from this IP. Please try again later.",
          message: "Too many requests from this IP. Please try again later."
        },
        {
          status: 429,
          headers: { "Retry-After": "3600" }
        }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const { email, name = "User", purpose = "verification" } = (body || {}) as {
      email?: unknown;
      name?: unknown;
      purpose?: unknown;
    };
    const isReset = purpose === "reset_password";

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "User").trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Rate limit: Max 1 request per 60 seconds per email
    const lastEmailTime = emailRateLimit.get(cleanEmail);
    if (lastEmailTime && now - lastEmailTime < 60 * 1000) {
      const retryAfter = Math.ceil((60 * 1000 - (now - lastEmailTime)) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please wait 60 seconds before requesting another code.",
          message: "Too many requests. Please wait 60 seconds before requesting another code."
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) }
        }
      );
    }

    // Record timestamps for rate limiting
    ipTimestamps.push(now);
    ipRateLimit.set(clientIp, ipTimestamps);
    emailRateLimit.set(cleanEmail, now);

    // Generate 6-digit numeric verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store with 10 minutes expiration
    saveVerificationCode(cleanEmail, verificationCode, cleanName, 10);

    // Read SMTP configurations strictly from environment variables without hardcoded fallback credentials
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER)?.trim();
    const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
    const smtpPass = rawPass ? rawPass.replace(/\s+/g, "") : undefined;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const smtpFrom = process.env.SMTP_FROM?.trim();

    let emailSent = false;
    let messageId: string | null = null;

    if (smtpUser && smtpPass) {
      try {
        let transporter: ReturnType<typeof nodemailer.createTransport>;
        if (smtpHost) {
          transporter = nodemailer.createTransport({
            host: smtpHost,
            port,
            secure,
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          });
        } else if (smtpUser.endsWith("@gmail.com")) {
          transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          });
        } else {
          throw new Error("SMTP host configuration missing");
        }

        const subject = isReset
          ? `Your Projexa Password Reset Code: ${verificationCode}`
          : `Your Projexa Verification Code: ${verificationCode}`;

        const textContent = isReset
          ? `Hello ${cleanName},\n\nYour 6-digit password reset code for Projexa is: ${verificationCode}\n\nThis code will expire in 10 minutes. If you did not request a password reset, you can safely ignore this email.\n\nBest regards,\nProjexa Workspaces Team`
          : `Hello ${cleanName},\n\nYour 6-digit verification code for Projexa is: ${verificationCode}\n\nThis code will expire in 10 minutes. If you did not request this verification, please ignore this email.\n\nBest regards,\nProjexa Workspaces Team`;

        const escapedName = escapeHtml(cleanName);

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #03131e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #03131e; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background: linear-gradient(180deg, #07293a 0%, #051a26 100%); border-radius: 20px; border: 1px solid rgba(6, 182, 212, 0.4); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); overflow: hidden;">
          
          <!-- Top Beam Line -->
          <tr>
            <td style="height: 3px; background: linear-gradient(90deg, #06b6d4, #22d3ee, #06b6d4);"></td>
          </tr>

          <!-- Brand Header -->
          <tr>
            <td style="padding: 35px 35px 20px 35px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); border-radius: 12px; width: 44px; height: 44px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 22px; line-height: 44px;">🚀</span>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <span style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Projexa</span>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 15px; display: inline-block; padding: 4px 12px; background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 20px;">
                <span style="font-size: 11px; font-weight: 700; color: #22d3ee; text-transform: uppercase; letter-spacing: 1px;">${isReset ? "Password Reset Code" : "Email Verification Code"}</span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 10px 35px 25px 35px; text-align: center;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                ${isReset ? "Reset Your Account Password" : "Confirm Your Email Address"}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                ${isReset ? `Hi <strong style="color: #e2e8f0;">${escapedName}</strong>, we received a request to reset your Projexa account password. Please enter the verification code below to set a new password:` : `Hi <strong style="color: #e2e8f0;">${escapedName}</strong>, thank you for joining Projexa. Please enter the verification code below to verify your account:`}
              </p>

              <!-- Verification Code Display Box -->
              <div style="background: #03131e; border: 2px dashed #06b6d4; border-radius: 14px; padding: 22px 20px; margin: 20px auto 25px auto; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                  Your 6-Digit Code
                </div>
                <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #22d3ee; text-shadow: 0 0 15px rgba(34, 211, 238, 0.4);">
                  ${verificationCode}
                </div>
              </div>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                ⏱️ This code will expire in <strong style="color: #cbd5e1;">10 minutes</strong>.
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                If you didn't create a Projexa account, you can safely disregard this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 35px 30px 35px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); background-color: rgba(3, 19, 30, 0.4);">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">
                Sent with security by Projexa Workspaces
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569;">
                &copy; ${new Date().getFullYear()} Projexa. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        const fromAddress = smtpFrom || (smtpUser ? `"Projexa Workspaces" <${smtpUser}>` : undefined);
        const info = await transporter.sendMail({
          from: fromAddress,
          to: cleanEmail,
          subject,
          text: textContent,
          html: htmlContent
        });

        emailSent = true;
        messageId = info.messageId;
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
      }
    }

    const isDev = process.env.NODE_ENV === "development";

    if (!emailSent) {
      return NextResponse.json({
        success: false,
        emailSent: false,
        message: "Email send nahi ho saki, dobara try karo",
        error: "Email send nahi ho saki, dobara try karo",
        ...(isDev ? { debugCode: verificationCode } : {})
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      message: `Verification code sent to ${cleanEmail}`,
      ...(messageId ? { messageId } : {}),
      ...(isDev ? { debugCode: verificationCode } : {})
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { success: false, error: "Failed to process verification request" },
      { status: 500 }
    );
  }
}
