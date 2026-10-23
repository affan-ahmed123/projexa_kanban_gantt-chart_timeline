import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      workspaceId,
      workspaceName,
      inviterName,
      inviterEmail,
      recipientEmail,
      recipientName,
      role = "Developer",
      inviteUrl
    } = body;

    if (!recipientEmail || !workspaceName) {
      return NextResponse.json(
        { error: "recipientEmail and workspaceName are required" },
        { status: 400 }
      );
    }

    const leadName = inviterName || "Team Lead";
    const leadEmail = inviterEmail || "lead@workspace.com";
    const memberName = recipientName || recipientEmail.split("@")[0] || "Team Member";
    const subject = `Invitation: Join "${workspaceName}" workspace on Projexa`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 32px 32px 20px 32px; background: #0f172a; text-align: left;">
        <span style="display: inline-block; background: rgba(255,255,255,0.15); color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Projexa Workspace Invitation</span>
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 12px 0 0 0;">You're Invited to Join ${workspaceName}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">Hello <strong>${memberName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
          <strong>${leadName}</strong> (Team Lead) has invited you to collaborate in the <strong>${workspaceName}</strong> workspace on Projexa as a <strong>${role}</strong>.
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f1f5f9; border-radius: 12px; border-left: 4px solid #3b82f6; margin: 20px 0;">
          <tr>
            <td style="padding: 16px;">
              <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 4px;">Team Lead: ${leadName}</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">Email: ${leadEmail}</div>
              <div style="font-size: 12px; color: #334155;">Assigned Role: <strong style="color: #2563eb;">${role}</strong></div>
            </td>
          </tr>
        </table>

        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 20px 0 24px 0;">
          Click the button below to accept your invitation. You will immediately enter the workspace and see all tasks assigned to you on the Kanban board.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #0f172a; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 12px; box-shadow: 0 3px 10px rgba(15,23,42,0.25);">
            Accept Invitation & Join Workspace →
          </a>
        </div>

        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; line-height: 1.4;">
          If the button above does not open in your browser, you can copy and paste this link:<br>
          <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
        <span style="font-size: 11px; color: #94a3b8;">
          Sent by Team Lead ${leadName} (${leadEmail}) via Projexa Workspaces.
        </span>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `Hello ${memberName},

${leadName} (${leadEmail}) has invited you to join the "${workspaceName}" workspace on Projexa as a ${role}.

Please accept your invitation and join the workspace by visiting:
${inviteUrl}

Best regards,
${leadName} (Team Lead)
${leadEmail}`;

    let emailSent = false;
    let deliveryError: string | null = null;
    let messageId: string | null = null;

    // Permanently configured SMTP credentials (Gmail App Password)
    const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || "affannadeem08@gmail.com").trim();
    const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "dqtojytcfbfdtgyz";
    const smtpPass = rawPass.replace(/\s+/g, ""); // Clean 16-character Google App Password

    if (smtpUser && smtpPass) {
      try {
        const port = Number(process.env.SMTP_PORT || 587);
        const secure = process.env.SMTP_SECURE === "true" || port === 465;

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

        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || `"${leadName} via Projexa" <${smtpUser}>`,
          to: recipientEmail,
          replyTo: leadEmail,
          subject,
          text: textContent,
          html: htmlContent
        });

        emailSent = true;
        messageId = info.messageId;
        console.info(`[Projexa Email] 📬 Successfully delivered invitation to ${recipientEmail}: ${info.messageId}`);
      } catch (err) {
        deliveryError = err instanceof Error ? err.message : "SMTP transmission failed";
        console.error("[Projexa Email] ❌ Email dispatch failed:", deliveryError);
      }
    } else {
      console.info(`[Projexa Email Service] ℹ️ SMTP not configured. Prepared invitation for: ${recipientEmail}`);
    }

    return NextResponse.json({
      success: emailSent || !deliveryError,
      emailSent,
      deliveryError,
      messageId,
      message: emailSent
        ? `Invitation email successfully delivered to ${recipientEmail}`
        : deliveryError
          ? `Failed to deliver email: ${deliveryError}`
          : `Invitation generated for ${recipientEmail}. SMTP configuration required for automatic inbox delivery.`,
      recipientEmail,
      recipientName: memberName,
      workspaceName,
      inviterName: leadName,
      inviterEmail: leadEmail,
      subject,
      bodyText: textContent,
      inviteUrl,
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Projexa Email Service] Error handling invitation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invitation email", emailSent: false },
      { status: 500 }
    );
  }

}
