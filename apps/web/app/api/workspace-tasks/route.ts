import { NextResponse } from "next/server";
import type { Task } from "@workspace/types";

export const dynamic = "force-dynamic";

type WorkspaceRecord = {
  tasks: Task[];
  version: number;
  updatedAt: number;
  lastSender?: string;
};

// In-memory cache on Next.js server across sessions/incognito
const globalWorkspaceTasks = new Map<string, WorkspaceRecord>();

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0"
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const record = globalWorkspaceTasks.get(workspaceId);
  return NextResponse.json(
    {
      workspaceId,
      tasks: record ? record.tasks : [],
      version: record ? record.version : 0,
      updatedAt: record ? record.updatedAt : 0,
      lastSender: record?.lastSender
    },
    { headers: NO_CACHE_HEADERS }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, tasks, sender } = body;

    if (!workspaceId || !Array.isArray(tasks)) {
      return NextResponse.json({ error: "workspaceId and tasks array are required" }, { status: 400 });
    }

    const previous = globalWorkspaceTasks.get(workspaceId);
    const nextVersion = (previous?.version ?? 0) + 1;
    const now = Date.now();

    globalWorkspaceTasks.set(workspaceId, {
      tasks,
      version: nextVersion,
      updatedAt: now,
      lastSender: sender
    });

    return NextResponse.json(
      { success: true, workspaceId, count: tasks.length, version: nextVersion },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync tasks" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
