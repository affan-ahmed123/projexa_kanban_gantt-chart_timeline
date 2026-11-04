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
  deletedMemberEmails?: string[] | undefined;
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

const isRealMemberRecord = (m: WorkspaceMemberRecord | null | undefined): m is WorkspaceMemberRecord => {
  if (!m || typeof m !== "object" || !m.email) return false;
  const cleanEmail = m.email.toLowerCase().trim();
  const cleanName = (m.name || "").trim();
  if (cleanEmail.endsWith("@workspace.local") || cleanEmail.includes("workspace.local")) return false;
  if (cleanName.includes("::")) return false;
  return true;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const record = globalWorkspaceRegistry.get(workspaceId);
  const deletedSet = new Set((record?.deletedMemberEmails || []).map((e) => e.toLowerCase().trim()));
  const activeMembers = (record?.members || []).filter(
    (m) => isRealMemberRecord(m) && !deletedSet.has(m.email.toLowerCase().trim())
  );

  return NextResponse.json(
    {
      workspaceId,
      workspaceName: record?.workspaceName,
      slug: record?.slug,
      icon: record?.icon,
      department: record?.department,
      creatorEmail: record?.creatorEmail,
      teamLead: record?.teamLead,
      members: activeMembers,
      deletedMemberEmails: record?.deletedMemberEmails || [],
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
      deletedMemberEmails?: string[];
      removedMemberEmail?: string;
      replaceMembers?: boolean;
      action?: string;
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
      deletedMemberEmails,
      removedMemberEmail,
      sender
    } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const existingRecord = globalWorkspaceRegistry.get(workspaceId);
    const record: WorkspaceRegistryEntry = existingRecord ?? {
      workspaceId,
      members: [],
      deletedMemberEmails: [],
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

    // Accumulate deleted member emails so removed members can never be accidentally resurrected
    const deletedSet = new Set(
      [
        ...(record.deletedMemberEmails || []),
        ...(Array.isArray(deletedMemberEmails) ? deletedMemberEmails : []),
        ...(removedMemberEmail ? [removedMemberEmail] : [])
      ]
        .map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
        .filter(Boolean)
    );

    // If a full members array is supplied (from saveActiveWorkspace, removeMember, or addMember),
    // it is authoritative: sanitize and replace record.members directly, excluding any deleted members.
    if (Array.isArray(members)) {
      const sanitized: WorkspaceMemberRecord[] = [];
      const seen = new Set<string>();
      for (const m of members) {
        if (isRealMemberRecord(m)) {
          const emailKey = m.email.trim().toLowerCase();
          if (!deletedSet.has(emailKey) && !seen.has(emailKey)) {
            seen.add(emailKey);
            const cleanName = m.name?.replace(/::(male|female)$/, "") || emailKey.split("@")[0] || "Team Member";
            sanitized.push({
              id: m.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: cleanName,
              email: emailKey,
              role: m.role || "Developer",
              gender: m.gender || "neutral"
            });
          }
        }
      }
      record.members = sanitized;
    } else if (isRealMemberRecord(member)) {
      // Adding a single member explicitly removes them from the deleted set
      const emailKey = member.email.trim().toLowerCase();
      deletedSet.delete(emailKey);
      const cleanName = member.name?.replace(/::(male|female)$/, "") || emailKey.split("@")[0] || "Team Member";
      const existingIdx = record.members.findIndex((m) => m.email.toLowerCase().trim() === emailKey);
      const newRec: WorkspaceMemberRecord = {
        id: member.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        email: emailKey,
        role: member.role || "Developer",
        gender: member.gender || "neutral"
      };
      if (existingIdx >= 0) {
        record.members[existingIdx] = newRec;
      } else {
        record.members.push(newRec);
      }
    }

    record.deletedMemberEmails = Array.from(deletedSet);
    record.version = (record.version || 0) + 1;
    record.updatedAt = Date.now();
    globalWorkspaceRegistry.set(workspaceId, record);

    return NextResponse.json(
      {
        success: true,
        workspaceId,
        members: record.members,
        deletedMemberEmails: record.deletedMemberEmails,
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const email = searchParams.get("email")?.toLowerCase().trim();
    const memberId = searchParams.get("memberId");

    if (!workspaceId || (!email && !memberId)) {
      return NextResponse.json({ error: "workspaceId and email/memberId are required" }, { status: 400 });
    }

    const record = globalWorkspaceRegistry.get(workspaceId);
    if (record) {
      if (email) {
        record.deletedMemberEmails = Array.from(new Set([...(record.deletedMemberEmails || []), email]));
        record.members = record.members.filter((m) => m.email.toLowerCase().trim() !== email);
      }
      if (memberId) {
        record.members = record.members.filter((m) => m.id !== memberId);
      }
      record.version = (record.version || 0) + 1;
      record.updatedAt = Date.now();
      globalWorkspaceRegistry.set(workspaceId, record);
    }

    return NextResponse.json(
      {
        success: true,
        workspaceId,
        members: record?.members || [],
        deletedMemberEmails: record?.deletedMemberEmails || []
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete workspace member" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
