import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Production mein trusted proxy header aur shared store (Redis/KV) chahiye, in-memory limit serverless pe instance-local hai.
const globalRateLimit = globalThis as unknown as {
  __inviteIpLimit?: Map<string, number[]>;
  __inviteEmailLimit?: Map<string, number[]>;
  __inviteWorkspaceLimit?: Map<string, number[]>;
};

if (!globalRateLimit.__inviteIpLimit) {
  globalRateLimit.__inviteIpLimit = new Map<string, number[]>();
}
if (!globalRateLimit.__inviteEmailLimit) {
  globalRateLimit.__inviteEmailLimit = new Map<string, number[]>();
}
if (!globalRateLimit.__inviteWorkspaceLimit) {
  globalRateLimit.__inviteWorkspaceLimit = new Map<string, number[]>();
}

const ipLimitMap = globalRateLimit.__inviteIpLimit;
const emailLimitMap = globalRateLimit.__inviteEmailLimit;
const workspaceLimitMap = globalRateLimit.__inviteWorkspaceLimit;

const cleanupOldTimestamps = (map: Map<string, number[]>, cutoff: number) => {
  for (const [key, timestamps] of map.entries()) {
    const active = timestamps.filter((t) => t > cutoff);
    if (active.length === 0) {
      map.delete(key);
    } else {
      map.set(key, active);
    }
  }
};

const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
};

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const stripNewlines = (val: string): string => val.replace(/[\r\n]+/g, " ").trim();

const ALLOWED_ROLES = ["Developer", "Designer", "Product Manager", "QA", "Admin"] as const;

export async function POST(request: Request) {
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Prune stale entries
    cleanupOldTimestamps(ipLimitMap, oneHourAgo);
    cleanupOldTimestamps(emailLimitMap, oneHourAgo);
    cleanupOldTimestamps(workspaceLimitMap, oneHourAgo);

    const clientIp = getClientIp(request);

    // IP rate limit: max 20 per hour
    const ipRequests = (ipLimitMap.get(clientIp) || []).filter((t) => t > oneHourAgo);
    if (ipRequests.length >= 20) {
      return NextResponse.json(
        {
          error: "Bohat zyada requests, baad mein try karo",
          message: "Bohat zyada requests, baad mein try karo",
          emailSent: false
        },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const {
      workspaceId,
      workspaceName,
      inviterName,
      inviterEmail,
      recipientEmail,
      recipientName,
      role = "Developer",
      inviteUrl
    } = (body || {}) as Record<string, unknown>;

    // Recipient email validation
    if (!recipientEmail || typeof recipientEmail !== "string") {
      return NextResponse.json(
        { error: "recipientEmail is required and must be a string" },
        { status: 400 }
      );
    }

    const cleanRecipientEmail = recipientEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !cleanRecipientEmail ||
      cleanRecipientEmail.length >= 254 ||
      !emailRegex.test(cleanRecipientEmail)
    ) {
      return NextResponse.json(
        { error: "Invalid recipientEmail address" },
        { status: 400 }
      );
    }

    // Workspace name validation
    if (!workspaceName || typeof workspaceName !== "string") {
      return NextResponse.json(
        { error: "workspaceName is required and must be a string" },
        { status: 400 }
      );
    }

    const cleanWorkspaceName = workspaceName.trim();
    if (!cleanWorkspaceName || cleanWorkspaceName.length > 80) {
      return NextResponse.json(
        { error: "workspaceName is required and must be 80 characters or fewer" },
        { status: 400 }
      );
    }

    // Length limit checks (max 80)
    if (inviterName !== undefined && inviterName !== null) {
      if (typeof inviterName !== "string" || inviterName.trim().length > 80) {
        return NextResponse.json(
          { error: "inviterName must be 80 characters or fewer" },
          { status: 400 }
        );
      }
    }

    if (recipientName !== undefined && recipientName !== null) {
      if (typeof recipientName !== "string" || recipientName.trim().length > 80) {
        return NextResponse.json(
          { error: "recipientName must be 80 characters or fewer" },
          { status: 400 }
        );
      }
    }

    // Role validation from allowlist
    const cleanRole = typeof role === "string" ? role.trim() : "Developer";
    if (!ALLOWED_ROLES.includes(cleanRole as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json(
        { error: "Invalid role specified" },
        { status: 400 }
      );
    }

    // inviteUrl validation: must be on application site origin and use http/https
    if (!inviteUrl || typeof inviteUrl !== "string") {
      return NextResponse.json(
        { error: "inviteUrl is required and must be a valid URL string" },
        { status: 400 }
      );
    }

    const siteOrigin = new URL(request.url).origin;
    let parsedInviteUrl: URL;
    try {
      parsedInviteUrl = new URL(inviteUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid inviteUrl" },
        { status: 400 }
      );
    }

    if (
      (parsedInviteUrl.protocol !== "http:" && parsedInviteUrl.protocol !== "https:") ||
      parsedInviteUrl.origin !== siteOrigin ||
      !inviteUrl.startsWith(siteOrigin)
    ) {
      return NextResponse.json(
        { error: "inviteUrl must originate from the application host" },
        { status: 400 }
      );
    }

    // Recipient email rate limit: max 3 per hour
    const emailRequests = (emailLimitMap.get(cleanRecipientEmail) || []).filter((t) => t > oneHourAgo);
    if (emailRequests.length >= 3) {
      return NextResponse.json(
        {
          error: "Bohat zyada requests, baad mein try karo",
          message: "Bohat zyada requests, baad mein try karo",
          emailSent: false
        },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    // Workspace ID rate limit: max 30 per hour
    const cleanWorkspaceId = typeof workspaceId === "string" ? workspaceId.trim() : "";
    let workspaceRequests: number[] = [];
    if (cleanWorkspaceId) {
      workspaceRequests = (workspaceLimitMap.get(cleanWorkspaceId) || []).filter((t) => t > oneHourAgo);
      if (workspaceRequests.length >= 30) {
        return NextResponse.json(
          {
            error: "Bohat zyada requests, baad mein try karo",
            message: "Bohat zyada requests, baad mein try karo",
            emailSent: false
          },
          { status: 429, headers: { "Retry-After": "3600" } }
        );
      }
    }

    // Register rate limit timestamps
    ipRequests.push(now);
    ipLimitMap.set(clientIp, ipRequests);

    emailRequests.push(now);
    emailLimitMap.set(cleanRecipientEmail, emailRequests);

    if (cleanWorkspaceId) {
      workspaceRequests.push(now);
      workspaceLimitMap.set(cleanWorkspaceId, workspaceRequests);
    }

    const cleanInviterName = typeof inviterName === "string" && inviterName.trim() ? inviterName.trim() : "Team Lead";
    const cleanInviterEmail = typeof inviterEmail === "string" ? inviterEmail.trim() : "";
    const cleanRecipientName = typeof recipientName === "string" && recipientName.trim()
      ? recipientName.trim()
      : cleanRecipientEmail.split("@")[0] || "Team Member";

    // Clean subject with no \r or \n and max 150 chars
    const safeSubjectWorkspace = stripNewlines(cleanWorkspaceName);
    const rawSubject = `Invitation: Join "${safeSubjectWorkspace}" workspace on Projexa`;
    const subject = stripNewlines(rawSubject).slice(0, 150);

    // HTML-escaped values
    const safeWorkspaceNameHtml = escapeHtml(cleanWorkspaceName);
    const safeInviterNameHtml = escapeHtml(cleanInviterName);
    const safeInviterEmailHtml = escapeHtml(cleanInviterEmail);
    const safeRecipientNameHtml = escapeHtml(cleanRecipientName);
    const safeRoleHtml = escapeHtml(cleanRole);
    const safeInviteUrlHtml = escapeHtml(inviteUrl);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 32px 32px 20px 32px; background: #0f172a; text-align: left;">
        <span style="display: inline-block; background: rgba(255,255,255,0.15); color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Projexa Workspace Invitation</span>
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 12px 0 0 0;">You're Invited to Join ${safeWorkspaceNameHtml}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">Hello <strong>${safeRecipientNameHtml}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
          <strong>${safeInviterNameHtml}</strong> (Team Lead) has invited you to collaborate in the <strong>${safeWorkspaceNameHtml}</strong> workspace on Projexa as a <strong>${safeRoleHtml}</strong>.
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f1f5f9; border-radius: 12px; border-left: 4px solid #3b82f6; margin: 20px 0;">
          <tr>
            <td style="padding: 16px;">
              <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 4px;">Team Lead: ${safeInviterNameHtml}</div>
              ${safeInviterEmailHtml ? `<div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">Email: ${safeInviterEmailHtml}</div>` : ""}
              <div style="font-size: 12px; color: #334155;">Assigned Role: <strong style="color: #2563eb;">${safeRoleHtml}</strong></div>
            </td>
          </tr>
        </table>

        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 20px 0 24px 0;">
          Click the button below to accept your invitation. You will immediately enter the workspace and see all tasks assigned to you on the Kanban board.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${safeInviteUrlHtml}" style="display: inline-block; background: #0f172a; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 12px; box-shadow: 0 3px 10px rgba(15,23,42,0.25);">
            Accept Invitation & Join Workspace →
          </a>
        </div>

        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; line-height: 1.4;">
          If the button above does not open in your browser, you can copy and paste this link:<br>
          <a href="${safeInviteUrlHtml}" style="color: #2563eb; word-break: break-all;">${safeInviteUrlHtml}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
        <span style="font-size: 11px; color: #94a3b8;">
          Sent by Team Lead ${safeInviterNameHtml}${safeInviterEmailHtml ? ` (${safeInviterEmailHtml})` : ""} via Projexa Workspaces.
        </span>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Plain-text values with newlines stripped
    const safeLeadNameText = stripNewlines(cleanInviterName);
    const safeLeadEmailText = stripNewlines(cleanInviterEmail);
    const safeWsNameText = stripNewlines(cleanWorkspaceName);
    const safeMemberNameText = stripNewlines(cleanRecipientName);
    const safeRoleText = stripNewlines(cleanRole);

    const textContent = `Hello ${safeMemberNameText},

${safeLeadNameText}${safeLeadEmailText ? ` (${safeLeadEmailText})` : ""} has invited you to join the "${safeWsNameText}" workspace on Projexa as a ${safeRoleText}.

Please accept your invitation and join the workspace by visiting:
${inviteUrl}

Best regards,
${safeLeadNameText} (Team Lead)${safeLeadEmailText ? `\n${safeLeadEmailText}` : ""}`;

    let emailSent = false;
    let messageId: string | null = null;

    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER)?.trim();
    const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
    const smtpPass = rawPass ? rawPass.replace(/\s+/g, "") : undefined;

    if (smtpUser && smtpPass) {
      try {
        const port = Number(process.env.SMTP_PORT || 587);
        const secure = process.env.SMTP_SECURE === "true" || port === 465;

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

        const fromAddress = process.env.SMTP_FROM?.trim() || `"${safeLeadNameText} via Projexa" <${smtpUser}>`;
        const mailOptions = {
          from: fromAddress,
          to: cleanRecipientEmail,
          subject,
          text: textContent,
          html: htmlContent,
          ...(cleanInviterEmail ? { replyTo: cleanInviterEmail } : {})
        };

        const info = await transporter.sendMail(mailOptions);
        emailSent = true;
        messageId = info.messageId;
      } catch (err) {
        // Server console mein sirf error.message log karo, poora error object ya credentials nahi
        console.error(err instanceof Error ? err.message : String(err));
      }
    }

    if (!emailSent) {
      return NextResponse.json({
        success: false,
        emailSent: false,
        message: "Email send nahi ho saki",
        error: "Email send nahi ho saki"
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      message: `Invitation email sent to ${cleanRecipientEmail}`,
      ...(messageId ? { messageId } : {})
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to send invitation email", emailSent: false },
      { status: 500 }
    );
  }
}
