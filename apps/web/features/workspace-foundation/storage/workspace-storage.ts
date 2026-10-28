import type { Task } from "@workspace/types";
import type { WorkspaceMemberRole } from "./auth-storage";

export type WorkspaceMember = {
  id: string;
  name: string;
  email: string;
  role: WorkspaceMemberRole;
  gender?: "neutral" | "male" | "female";
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  department: string;
  creatorEmail: string;
  teamLead: {
    name: string;
    email: string;
    gender?: "neutral" | "male" | "female";
  };
  members: WorkspaceMember[];
  createdAt: string;
};

export const DEFAULT_LEAD = { name: "", email: "" };
export const DEFAULT_MEMBERS: WorkspaceMember[] = [];

export const EMPTY_WORKSPACE: Workspace = {
  id: "",
  name: "No Workspace Selected",
  slug: "",
  icon: "rocket",
  department: "Software Engineering",
  creatorEmail: "",
  teamLead: DEFAULT_LEAD,
  members: [],
  createdAt: ""
};

export const DEFAULT_WORKSPACE: Workspace = EMPTY_WORKSPACE;
export const DEFAULT_STARTER_TASKS: readonly Task[] = [];

export const isRealMember = (m: WorkspaceMember | null | undefined): m is WorkspaceMember => {
  if (!m || typeof m !== "object" || !m.email) return false;
  const cleanEmail = m.email.toLowerCase().trim();
  const cleanName = (m.name || "").trim();
  if (cleanEmail.endsWith("@workspace.local") || cleanEmail.includes("workspace.local")) return false;
  if (cleanName.includes("::")) return false;
  return true;
};

export const getAllWorkspaces = (): Workspace[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("projexa_workspaces") || localStorage.getItem("nutsyll_workspaces");
    if (!raw) return [];
    const list = JSON.parse(raw) as Workspace[];
    if (Array.isArray(list)) {
      let changed = false;
      const cleaned = list
        .filter((w) => w.id && w.id !== "ws-primary")
        .map((w) => {
          const originalCount = w.members?.length || 0;
          const filteredMembers = (w.members || []).filter(isRealMember);
          if (filteredMembers.length !== originalCount) changed = true;
          return { ...w, members: filteredMembers };
        });
      if (changed || cleaned.length !== list.length) {
        localStorage.setItem("projexa_workspaces", JSON.stringify(cleaned));
      }
      return cleaned;
    }
    return [];
  } catch {
    return [];
  }
};

export const getWorkspacesForUser = (userEmail?: string): Workspace[] => {
  const all = getAllWorkspaces();
  if (!userEmail || !userEmail.trim()) return all;
  const target = userEmail.trim().toLowerCase();
  return all.filter((ws) => {
    const creator = ws.creatorEmail?.toLowerCase();
    const lead = ws.teamLead?.email?.toLowerCase();
    const isMember = ws.members?.some((m) => m.email?.toLowerCase() === target);
    return creator === target || lead === target || isMember;
  });
};

export const saveActiveWorkspace = (ws: Workspace): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("projexa_active_workspace", JSON.stringify(ws));
    localStorage.removeItem("nutsyll_active_workspace");
    const currentList = getAllWorkspaces();
    const index = currentList.findIndex((w) => w.id === ws.id);
    let updatedList: Workspace[];
    if (index >= 0) {
      updatedList = [...currentList];
      updatedList[index] = ws;
    } else {
      updatedList = [ws, ...currentList];
    }
    localStorage.setItem("projexa_workspaces", JSON.stringify(updatedList));
    localStorage.removeItem("nutsyll_workspaces");
  } catch (e) {
    console.error("Failed to save workspace", e);
  }
};

export const getActiveWorkspace = (): Workspace => {
  if (typeof window === "undefined") return EMPTY_WORKSPACE;
  try {
    const raw = localStorage.getItem("projexa_active_workspace") || localStorage.getItem("nutsyll_active_workspace");
    if (raw) {
      const parsed = JSON.parse(raw) as Workspace;
      if (parsed && parsed.id && parsed.id !== "ws-primary") {
        const filteredMembers = (parsed.members || []).filter(isRealMember);
        if (filteredMembers.length !== (parsed.members?.length || 0)) {
          const updated = { ...parsed, members: filteredMembers };
          saveActiveWorkspace(updated);
          return updated;
        }
        return parsed;
      }
      localStorage.removeItem("projexa_active_workspace");
      localStorage.removeItem("nutsyll_active_workspace");
    }
    const all = getAllWorkspaces();
    if (all.length > 0 && all[0]) {
      saveActiveWorkspace(all[0]);
      return all[0];
    }
    return EMPTY_WORKSPACE;
  } catch {
    return EMPTY_WORKSPACE;
  }
};

export const switchActiveWorkspace = (workspaceId: string): Workspace => {
  const all = getAllWorkspaces();
  const matched = all.find((w) => w.id === workspaceId);
  if (matched) {
    saveActiveWorkspace(matched);
    return matched;
  }
  return getActiveWorkspace();
};

export const normalizeTaskDates = (task: Task): Task => {
  const id = typeof task.id === "string" && task.id ? task.id : `task-${Date.now()}`;
  const title = typeof task.title === "string" && task.title.trim() ? task.title : "Task";
  const status = (task.status === "todo" || task.status === "in_progress" || task.status === "review" || task.status === "done")
    ? task.status
    : "todo";
  const rawAssignee = typeof task.assigneeId === "string" ? task.assigneeId.trim() : null;
  const assigneeId = rawAssignee && rawAssignee.length > 0 ? rawAssignee : null;
  const dependsOn = Array.isArray(task.dependsOn) ? task.dependsOn.filter((d): d is string => typeof d === "string") : [];
  const now = new Date().toISOString();
  const createdAt = typeof task.createdAt === "string" && task.createdAt ? task.createdAt : now;
  const updatedAt = typeof task.updatedAt === "string" && task.updatedAt ? task.updatedAt : now;

  let startDate = typeof task.startDate === "string" && task.startDate.trim() ? task.startDate.trim() : null;
  let dueDate = typeof task.dueDate === "string" && task.dueDate.trim() ? task.dueDate.trim() : null;

  if (startDate) {
    startDate = !isNaN(Date.parse(startDate)) ? startDate.slice(0, 10) : null;
  }
  if (dueDate) {
    dueDate = !isNaN(Date.parse(dueDate)) ? dueDate.slice(0, 10) : null;
  }

  return {
    ...task,
    id,
    title,
    status,
    assigneeId,
    startDate,
    dueDate,
    dependsOn,
    createdAt,
    updatedAt
  };
};

export const getWorkspaceTasks = (workspaceId: string): Task[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`projexa_tasks_${workspaceId}`) || localStorage.getItem(`nutsyll_tasks_${workspaceId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Task[];
    return Array.isArray(parsed) ? parsed.map(normalizeTaskDates) : null;
  } catch {
    return null;
  }
};

export const saveWorkspaceTasks = (workspaceId: string, tasks: readonly Task[]): void => {
  if (typeof window === "undefined") return;
  try {
    const normalized = tasks.map(normalizeTaskDates);
    localStorage.setItem(`projexa_tasks_${workspaceId}`, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("projexa_tasks_change", { detail: { workspaceId } }));
    window.dispatchEvent(new CustomEvent("nutsyll_tasks_change", { detail: { workspaceId } }));
  } catch (e) {
    console.error("Failed to save workspace tasks", e);
  }
};

export const deleteWorkspace = (workspaceId: string): Workspace | null => {
  if (typeof window === "undefined") return null;
  try {
    const all = getAllWorkspaces();
    const remaining = all.filter((w) => w.id !== workspaceId);
    localStorage.setItem("projexa_workspaces", JSON.stringify(remaining));
    localStorage.removeItem("nutsyll_workspaces");
    localStorage.removeItem(`projexa_tasks_${workspaceId}`);
    localStorage.removeItem(`nutsyll_tasks_${workspaceId}`);

    const active = getActiveWorkspace();
    if (active.id === workspaceId) {
      if (remaining.length > 0 && remaining[0]) {
        saveActiveWorkspace(remaining[0]);
        return remaining[0];
      }
      localStorage.removeItem("projexa_active_workspace");
      localStorage.removeItem("nutsyll_active_workspace");
      return null;
    }
    return active;
  } catch (e) {
    console.error("Failed to delete workspace", e);
    return null;
  }
};

export const mergeWorkspaceMembers = (
  existing: readonly WorkspaceMember[],
  incoming: readonly WorkspaceMember[]
): WorkspaceMember[] => {
  const map = new Map<string, WorkspaceMember>();
  for (const m of existing) {
    if (isRealMember(m)) map.set(m.email.toLowerCase().trim(), m);
  }
  for (const m of incoming) {
    if (isRealMember(m)) {
      const key = m.email.toLowerCase().trim();
      const current = map.get(key);
      const cleanName = m.name?.replace(/::(male|female)$/, "") || current?.name || key.split("@")[0] || "Team Member";
      map.set(key, {
        id: m.id || current?.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        email: key,
        role: m.role || current?.role || "Developer",
        gender: m.gender || current?.gender || "neutral"
      });
    }
  }
  return Array.from(map.values());
};

export const syncWorkspaceMembersToServer = async (
  workspaceId: string,
  members: readonly WorkspaceMember[],
  ws?: Workspace | null
): Promise<void> => {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    const targetWs = ws || getAllWorkspaces().find((w) => w.id === workspaceId);
    await fetch("/api/workspace-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        workspaceName: targetWs?.name,
        slug: targetWs?.slug,
        icon: targetWs?.icon,
        department: targetWs?.department,
        creatorEmail: targetWs?.creatorEmail,
        teamLead: targetWs?.teamLead,
        members,
        sender: targetWs?.teamLead?.name || "Member Directory"
      })
    });
  } catch {}
};

export const syncWorkspaceMembersWithServer = async (workspaceId: string): Promise<WorkspaceMember[]> => {
  if (typeof window === "undefined" || !workspaceId) return [];
  try {
    const res = await fetch(`/api/workspace-members?workspaceId=${encodeURIComponent(workspaceId)}`, {
      cache: "no-store",
      headers: { Pragma: "no-cache" }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.members)) return [];

    const remoteMembers: WorkspaceMember[] = data.members;
    const all = getAllWorkspaces();
    const target = all.find((w) => w.id === workspaceId);
    if (!target) return remoteMembers;

    const merged = mergeWorkspaceMembers(target.members || [], remoteMembers);
    const hasDiff = merged.length !== target.members.length ||
      merged.some((m, idx) => target.members[idx]?.email?.toLowerCase() !== m.email.toLowerCase());

    if (hasDiff) {
      const updated: Workspace = { ...target, members: merged };
      saveActiveWorkspace(updated);
      window.dispatchEvent(new CustomEvent("projexa_workspace_members_change", { detail: { workspaceId, members: merged } }));
      window.dispatchEvent(new Event("projexa_session_change"));
    }
    return merged;
  } catch {
    return [];
  }
};

export const reconcileMembersFromTasks = (workspaceId: string, _tasks: readonly Task[]): void => {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    const all = getAllWorkspaces();
    const target = all.find((w) => w.id === workspaceId);
    if (!target) return;

    // Filter out any dummy members that might have previously leaked into storage
    const realOnly = (target.members || []).filter(isRealMember);
    if (realOnly.length !== (target.members || []).length) {
      const updated: Workspace = { ...target, members: realOnly };
      saveActiveWorkspace(updated);
      void syncWorkspaceMembersToServer(workspaceId, realOnly, updated);
      window.dispatchEvent(new CustomEvent("projexa_workspace_members_change", { detail: { workspaceId, members: realOnly } }));
      window.dispatchEvent(new Event("projexa_session_change"));
    }
  } catch {}
};

export const addMemberToWorkspace = (workspaceId: string, member: WorkspaceMember): Workspace | null => {
  if (typeof window === "undefined") return null;
  try {
    const all = getAllWorkspaces();
    const target = all.find((w) => w.id === workspaceId);
    if (!target) return null;
    const cleanEmail = member.email.toLowerCase();
    const existingIndex = target.members.findIndex((m) => m.email.toLowerCase() === cleanEmail);
    let updatedMembers: WorkspaceMember[];
    if (existingIndex >= 0) {
      updatedMembers = [...target.members];
      updatedMembers[existingIndex] = { ...updatedMembers[existingIndex], ...member };
    } else {
      updatedMembers = [...target.members, member];
    }
    const updated: Workspace = { ...target, members: updatedMembers };
    saveActiveWorkspace(updated);
    void syncWorkspaceMembersToServer(workspaceId, updatedMembers, updated);
    window.dispatchEvent(new CustomEvent("projexa_workspace_members_change", { detail: { workspaceId, members: updatedMembers } }));
    window.dispatchEvent(new Event("projexa_session_change"));
    return updated;
  } catch (e) {
    console.error("Failed to add member to workspace", e);
    return null;
  }
};

export const removeMemberFromWorkspace = (workspaceId: string, memberIdOrEmail: string): Workspace | null => {
  if (typeof window === "undefined") return null;
  try {
    const all = getAllWorkspaces();
    const target = all.find((w) => w.id === workspaceId);
    if (!target) return null;
    const cleanParam = memberIdOrEmail.toLowerCase();
    const updatedMembers = target.members.filter((m) => m.id !== memberIdOrEmail && m.email.toLowerCase() !== cleanParam);
    const updated: Workspace = {
      ...target,
      members: updatedMembers
    };
    saveActiveWorkspace(updated);
    void syncWorkspaceMembersToServer(workspaceId, updatedMembers, updated);
    window.dispatchEvent(new CustomEvent("projexa_workspace_members_change", { detail: { workspaceId, members: updatedMembers } }));
    window.dispatchEvent(new Event("projexa_session_change"));
    return updated;
  } catch (e) {
    console.error("Failed to remove member from workspace", e);
    return null;
  }
};

export const leaveWorkspace = (workspaceId: string, memberEmail: string): void => {
  if (typeof window === "undefined") return;
  try {
    removeMemberFromWorkspace(workspaceId, memberEmail);
    const active = getActiveWorkspace();
    if (active.id === workspaceId) {
      const remainingForUser = getWorkspacesForUser(memberEmail);
      if (remainingForUser.length > 0 && remainingForUser[0]) {
        saveActiveWorkspace(remainingForUser[0]);
      } else {
        localStorage.removeItem("projexa_active_workspace");
      }
    }
    window.dispatchEvent(new Event("projexa_session_change"));
  } catch (e) {
    console.error("Failed to leave workspace", e);
  }
};

