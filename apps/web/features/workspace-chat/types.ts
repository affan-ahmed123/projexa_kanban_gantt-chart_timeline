export type ChatAttachmentType = "image" | "video" | "file";

export type ChatAttachment = {
  id: string;
  name: string;
  type: ChatAttachmentType;
  url: string; // base64 DataURL or external link
  size: number; // size in bytes
  mimeType?: string | undefined;
};

export type ChatMessage = {
  id: string;
  workspaceId: string;
  senderName: string;
  senderEmail: string;
  senderRole?: string | undefined;
  senderGender?: "male" | "female" | "neutral" | undefined;
  content: string;
  attachment?: ChatAttachment | undefined;
  timestamp: number;
};

export type TypingUser = {
  name: string;
  email: string;
};
