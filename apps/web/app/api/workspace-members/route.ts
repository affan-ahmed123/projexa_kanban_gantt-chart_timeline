import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type WorkspaceMemberRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  gender?: "neutral" | "male" | "female" | undefined;
};

type WorkspaceRegistryEntry = {
  workspaceId: string;
  workspaceName?: string | undefined;
  slug?: string | undefined;
  icon?: string | undefined;
  department?: string | undefined;
  creatorEmail?: string | undefined;
  teamLead?: {
    name: string;
    email: string;
    gender?: "neutral" | "male" | "female" | undefined;
  } | undefined;
  members: WorkspaceMemberRecord[];
  version: number;
  updatedAt: number;
  lastSender?: string | undefined;
};

// In-memory cache on Next.js server across sessions/incognito
const globalWorkspaceRegistry: Map<string, WorkspaceRegistryEntry> =
  (globalThis as unknown as { __projexaWorkspaceRegistry?: Map<string, WorkspaceRegistryEntry> })
    .__projexaWorkspaceRegistry ??
  ((globalThis as unknown as { __projexaWorkspaceRegistry: Map<string, WorkspaceRegistryEntry> })
    .__projexaWorkspaceRegistry = new Map());

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

  const record = globalWorkspaceRegistry.get(workspaceId);
  return NextResponse.json(
    {
      workspaceId,
      workspaceName: record?.workspaceName,
      slug: record?.slug,
      icon: record?.icon,
      department: record?.department,
      creatorEmail: record?.creatorEmail,
      teamLead: record?.teamLead,
      members: record ? record.members : [],
      version: record ? record.version : 0,
      updatedAt: record ? record.updatedAt : 0,
      lastSender: record?.lastSender
    },
    { headers: NO_CACHE_HEADERS }
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      workspaceId?: string;
      workspaceName?: string;
      slug?: string;
      icon?: string;
      department?: string;
      creatorEmail?: string;
      teamLead?: {
        name?: string;
        email?: string;
        gender?: "neutral" | "male" | "female";
      };
      member?: WorkspaceMemberRecord;
      members?: WorkspaceMemberRecord[];
      sender?: string;
    };

    const {
      workspaceId,
      workspaceName,
      slug,
      icon,
      department,
      creatorEmail,
      teamLead,
      member,
      members,
      sender
    } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const existingRecord = globalWorkspaceRegistry.get(workspaceId);
    const record: WorkspaceRegistryEntry = existingRecord ?? {
      workspaceId,
      members: [],
      version: 0,
      updatedAt: Date.now()
    };

    if (typeof workspaceName === "string" && workspaceName.trim()) {
      record.workspaceName = workspaceName.trim();
    }
    if (typeof slug === "string" && slug.trim()) {
      record.slug = slug.trim();
    }
    if (typeof icon === "string" && icon.trim()) {
      record.icon = icon.trim();
    }
    if (typeof department === "string" && department.trim()) {
      record.department = department.trim();
    }
    if (typeof creatorEmail === "string" && creatorEmail.trim()) {
      record.creatorEmail = creatorEmail.trim().toLowerCase();
    }
    if (teamLead && typeof teamLead.email === "string" && teamLead.email.trim()) {
      record.teamLead = {
        name: typeof teamLead.name === "string" && teamLead.name.trim() ? teamLead.name.trim() : (record.teamLead?.name || "Team Lead"),
        email: teamLead.email.trim().toLowerCase(),
        gender: teamLead.gender || record.teamLead?.gender || "male"
      };
    }
    if (typeof sender === "string" && sender.trim()) {
      record.lastSender = sender.trim();
    }

    // Merge members list without duplicates
    const mergedMap = new Map<string, WorkspaceMemberRecord>();
    for (const m of record.members) {
      if (m?.email) mergedMap.set(m.email.toLowerCase().trim(), m);
    }

    // Add members from array
    if (Array.isArray(members)) {
      for (const m of members) {
        if (m && typeof m.email === "string" && m.email.trim()) {
          const emailKey = m.email.trim().toLowerCase();
          const existing = mergedMap.get(emailKey);
          mergedMap.set(emailKey, {
            id: m.id || existing?.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: m.name || existing?.name || emailKey.split("@")[0] || "Team Member",
            email: emailKey,
            role: m.role || existing?.role || "Developer",
            gender: m.gender || existing?.gender || "neutral"
          });
        }
      }
    }

    // Add single member if provided
    if (member && typeof member.email === "string" && member.email.trim()) {
      const emailKey = member.email.trim().toLowerCase();
      const existing = mergedMap.get(emailKey);
      mergedMap.set(emailKey, {
        id: member.id || existing?.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: member.name || existing?.name || emailKey.split("@")[0] || "Team Member",
        email: emailKey,
        role: member.role || existing?.role || "Developer",
        gender: member.gender || existing?.gender || "neutral"
      });
    }

    record.members = Array.from(mergedMap.values());
    record.version = (record.version || 0) + 1;
    record.updatedAt = Date.now();
    globalWorkspaceRegistry.set(workspaceId, record);

    return NextResponse.json(
      {
        success: true,
        workspaceId,
        members: record.members,
        version: record.version,
        count: record.members.length
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync workspace members" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
