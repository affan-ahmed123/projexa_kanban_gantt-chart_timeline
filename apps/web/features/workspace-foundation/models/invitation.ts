import type { Workspace, WorkspaceMember } from "./workspace-storage";

export type InvitationPayload = {
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
  inviterEmail: string;
  recipientEmail: string;
  recipientName: string;
  role: string;
  inviteUrl: string;
};

export const createInvitationUrl = (workspace: Workspace, member: WorkspaceMember): string => {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  return `${origin}/board?workspaceId=${encodeURIComponent(workspace.id)}&inviteEmail=${encodeURIComponent(
    member.email
  )}&inviteName=${encodeURIComponent(member.name)}&role=${encodeURIComponent(member.role)}`;
};

export const sendInvitationEmail = async (
  payload: InvitationPayload
): Promise<{ success: boolean; emailSent: boolean; message: string; error?: string }> => {
  try {
    const response = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (response.ok && data.emailSent) {
      return {
        success: true,
        emailSent: true,
        message: data.message || `Invitation email delivered directly to ${payload.recipientEmail}`
      };
    }
    return {
      success: response.ok,
      emailSent: false,
      message: data.message || `Invitation prepared for ${payload.recipientEmail}`,
      error:
        data.deliveryError ||
        data.error ||
        (data.emailSent === false ? "SMTP credentials not configured" : undefined)
    };
  } catch (err) {
    return {
      success: false,
      emailSent: false,
      message: `Failed to dispatch invitation email`,
      error: err instanceof Error ? err.message : "Network error"
    };
  }
};
