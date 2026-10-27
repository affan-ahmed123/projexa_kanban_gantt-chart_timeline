import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type ChatAttachment = {
  id: string;
  name: string;
  type: "image" | "video" | "file";
  url: string;
  size: number;
  mimeType?: string;
};

export type ChatMessage = {
  id: string;
  workspaceId: string;
  senderName: string;
  senderEmail: string;
  senderRole?: string;
  senderGender?: "male" | "female" | "neutral";
  content: string;
  attachment?: ChatAttachment;
  timestamp: number;
};

type TypingRecord = {
  name: string;
  email: string;
  expiresAt: number;
};

// In-memory workspace chat message cache across Next.js sessions/incognito tabs
const globalWorkspaceMessages = new Map<string, ChatMessage[]>();
const globalWorkspaceTyping = new Map<string, Map<string, TypingRecord>>();

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0"
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId query parameter is required" }, { status: 400 });
  }

  const list = globalWorkspaceMessages.get(workspaceId) ?? [];
  const sortedMessages = [...list].sort((a, b) => a.timestamp - b.timestamp);

  // Clean and collect active typing users
  const typingMap = globalWorkspaceTyping.get(workspaceId);
  const activeTyping: Array<{ name: string; email: string }> = [];
  if (typingMap) {
    const now = Date.now();
    for (const [email, record] of Array.from(typingMap.entries())) {
      if (record.expiresAt > now) {
        activeTyping.push({ name: record.name, email: record.email });
      } else {
        typingMap.delete(email);
      }
    }
  }

  return NextResponse.json(
    {
      workspaceId,
      messages: sortedMessages,
      typingUsers: activeTyping,
      count: sortedMessages.length
    },
    { headers: NO_CACHE_HEADERS }
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      workspaceId?: string;
      message?: ChatMessage;
      messages?: ChatMessage[];
      typingUser?: { name: string; email: string; isTyping: boolean };
    };
    const { workspaceId, message, messages, typingUser } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Handle typing update
    if (typingUser && typeof typingUser.email === "string") {
      let typingMap = globalWorkspaceTyping.get(workspaceId);
      if (!typingMap) {
        typingMap = new Map();
        globalWorkspaceTyping.set(workspaceId, typingMap);
      }
      if (typingUser.isTyping) {
        typingMap.set(typingUser.email.toLowerCase(), {
          name: typingUser.name,
          email: typingUser.email.toLowerCase(),
          expiresAt: Date.now() + 4000
        });
      } else {
        typingMap.delete(typingUser.email.toLowerCase());
      }
    }

    let list = globalWorkspaceMessages.get(workspaceId);
    if (!list) {
      list = [];
      globalWorkspaceMessages.set(workspaceId, list);
    }

    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (m && typeof m.id === "string" && !list.some((existing) => existing.id === m.id)) {
          list.push(m);
        }
      }
    } else if (message && typeof message.id === "string") {
      if (!list.some((existing) => existing.id === message.id)) {
        list.push(message);
      }
    }

    // Keep latest 300 messages per workspace
    if (list.length > 300) {
      list.splice(0, list.length - 300);
    }

    return NextResponse.json(
      { success: true, workspaceId, count: list.length },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record chat message" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  globalWorkspaceMessages.delete(workspaceId);
  globalWorkspaceTyping.delete(workspaceId);
  return NextResponse.json({ success: true, workspaceId }, { headers: NO_CACHE_HEADERS });
}
