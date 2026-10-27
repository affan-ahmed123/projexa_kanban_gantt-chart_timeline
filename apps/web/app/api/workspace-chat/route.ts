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
  content: string;
  attachment?: ChatAttachment;
  timestamp: number;
};

// In-memory workspace chat message cache across Next.js sessions/incognito tabs
const globalWorkspaceMessages = new Map<string, ChatMessage[]>();

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

  const messages = globalWorkspaceMessages.get(workspaceId) ?? [];
  return NextResponse.json(
    {
      workspaceId,
      messages,
      count: messages.length
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
    };
    const { workspaceId, message, messages } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
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

    // Keep latest 250 messages per workspace
    if (list.length > 250) {
      list.splice(0, list.length - 250);
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
  return NextResponse.json({ success: true, workspaceId }, { headers: NO_CACHE_HEADERS });
}
