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

export const getAllWorkspaces = (): Workspace[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("projexa_workspaces") || localStorage.getItem("nutsyll_workspaces");
    if (!raw) return [];
    const list = JSON.parse(raw) as Workspace[];
    if (Array.isArray(list)) {
      const cleaned = list.filter((w) => w.id && w.id !== "ws-primary");
      if (cleaned.length !== list.length) {
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
  let startDate = task.startDate;
  let dueDate = task.dueDate;

  if (!startDate && !dueDate) {
    startDate = task.createdAt ? task.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
    dueDate = new Date(Date.parse(startDate) + 3 * 86_400_000).toISOString().slice(0, 10);
  } else if (!startDate && dueDate) {
    startDate = new Date(Date.parse(dueDate) - 3 * 86_400_000).toISOString().slice(0, 10);
  } else if (startDate && !dueDate) {
    dueDate = new Date(Date.parse(startDate) + 3 * 86_400_000).toISOString().slice(0, 10);
  }

  if (startDate === task.startDate && dueDate === task.dueDate) {
    return task;
  }
  return {
    ...task,
    startDate,
    dueDate
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
    const updated: Workspace = {
      ...target,
      members: target.members.filter((m) => m.id !== memberIdOrEmail && m.email.toLowerCase() !== cleanParam)
    };
    saveActiveWorkspace(updated);
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
