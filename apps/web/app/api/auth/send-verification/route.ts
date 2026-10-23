import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { saveVerificationCode } from "../verification-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name = "New User" } = body;

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "Developer").trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Generate 6-digit numeric verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store with 10 minutes expiration
    saveVerificationCode(cleanEmail, verificationCode, cleanName, 10);

    // Read SMTP configurations (Defaults to Gmail App Password)
    const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || "affannadeem08@gmail.com").trim();
    const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "dqtojytcfbfdtgyz";
    const smtpPass = rawPass.replace(/\s+/g, "");
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    let emailSent = false;
    let deliveryError: string | null = null;
    let messageId: string | null = null;

    if (smtpUser && smtpPass) {
      try {
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
            host: smtpHost || "smtp.gmail.com",
            port,
            secure,
            auth: {
              user: smtpUser,
              pass: smtpPass
            },
            tls: {
              rejectUnauthorized: false
            }
          });
        }

        const subject = `Your Projexa Verification Code: ${verificationCode}`;

        const textContent = `Hello ${cleanName},

Your 6-digit verification code for Projexa is: ${verificationCode}

This code will expire in 10 minutes. If you did not request this verification, please ignore this email.

Best regards,
Projexa Workspaces Team`;

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
                <span style="font-size: 11px; font-weight: 700; color: #22d3ee; text-transform: uppercase; letter-spacing: 1px;">Email Verification Code</span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 10px 35px 25px 35px; text-align: center;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                Confirm Your Email Address
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                Hi <strong style="color: #e2e8f0;">${cleanName}</strong>, thank you for joining Projexa. Please enter the verification code below to verify your account:
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

        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || `"Projexa Workspaces" <${smtpUser}>`,
          to: cleanEmail,
          subject,
          text: textContent,
          html: htmlContent
        });

        emailSent = true;
        messageId = info.messageId;
        console.info(`[Projexa Auth] 📬 Verification code ${verificationCode} delivered to ${cleanEmail}: ${info.messageId}`);
      } catch (err) {
        deliveryError = err instanceof Error ? err.message : "SMTP transmission failed";
        console.error("[Projexa Auth] ❌ Verification email dispatch failed:", deliveryError);
      }
    } else {
      console.warn(`[Projexa Auth] ⚠️ SMTP credentials not found. Verification code for ${cleanEmail}: ${verificationCode}`);
    }

    return NextResponse.json({
      success: true,
      emailSent,
      deliveryError,
      messageId,
      message: emailSent
        ? `Verification code sent to ${cleanEmail}`
        : `Verification code generated for ${cleanEmail}. (Code logged in console)`,
      debugCode: process.env.NODE_ENV !== "production" ? verificationCode : undefined
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to process verification request";
    console.error("[Projexa Auth] Send verification error:", errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
