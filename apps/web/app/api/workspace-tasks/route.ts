import { NextResponse } from "next/server";
import type { Task } from "@workspace/types";

// In-memory cache on Next.js server across sessions/incognito
const globalWorkspaceTasks = new Map<string, Task[]>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const tasks = globalWorkspaceTasks.get(workspaceId) || [];
  return NextResponse.json({ workspaceId, tasks });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, tasks } = body;

    if (!workspaceId || !Array.isArray(tasks)) {
      return NextResponse.json({ error: "workspaceId and tasks array are required" }, { status: 400 });
    }

    globalWorkspaceTasks.set(workspaceId, tasks);
    return NextResponse.json({ success: true, workspaceId, count: tasks.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync tasks" },
      { status: 500 }
    );
  }
}
