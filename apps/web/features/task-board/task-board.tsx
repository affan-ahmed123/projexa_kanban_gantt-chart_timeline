"use client";

import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from "@workspace/types";
import { AlertCircle, CheckCircle2, LoaderCircle, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactElement } from "react";
import {
  ViewHeader,
  getActiveWorkspace,
  getCurrentUser,
  setCurrentUser,
  addMemberToWorkspace,
  switchActiveWorkspace,
  getWorkspaceTasks,
  saveWorkspaceTasks,
  type UserSession,
  type Workspace,
  type WorkspaceMember
} from "@/features/workspace-foundation/public";
import { createTasksApi } from "@/features/tasks/public";
import { clean, columns } from "./task-board.helpers";
import { TaskBoardColumn } from "./components/task-board-column";
import { TaskBoardFilterBar } from "./components/task-board-filter-bar";
import { TaskBoardSprintOverview } from "./components/task-board-sprint-overview";
import { TaskFormModal } from "./components/task-form-modal";

type Props = Readonly<{ apiBaseUrl: string }>;

export const TaskBoard = ({ apiBaseUrl }: Props): ReactElement => {
  const api = useMemo(() => createTasksApi(apiBaseUrl), [apiBaseUrl]);
  const [tasks, setTasks] = useState<readonly Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [mobileColumnTab, setMobileColumnTab] = useState<"all" | TaskStatus>("all");
  const [workspace, setWorkspace] = useState<Workspace>(getActiveWorkspace());
  const [currentUser, setCurrentUserState] = useState<UserSession | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const inviteWsId = params.get("workspaceId");
      const inviteEmail = params.get("inviteEmail");
      const inviteName = params.get("inviteName");
      const inviteRole = (params.get("role") as WorkspaceMember["role"]) || "Developer";

      if (inviteWsId && inviteEmail) {
        const cleanEmail = inviteEmail.trim().toLowerCase();
        const cleanName = inviteName ? inviteName.trim() : cleanEmail.split("@")[0] || "Team Member";
        const targetWs = switchActiveWorkspace(inviteWsId);
        setWorkspace(targetWs);

        if (!targetWs.members.some((m) => m.email.toLowerCase() === cleanEmail)) {
          addMemberToWorkspace(inviteWsId, {
            id: `mem-${Date.now()}`,
            name: cleanName,
            email: cleanEmail,
            role: inviteRole,
            gender: "neutral"
          });
        }
        const session: UserSession = { id: `usr-${Date.now()}`, name: cleanName, email: cleanEmail, role: inviteRole };
        setCurrentUser(session);
        setCurrentUserState(session);
        showToast(`Welcome ${cleanName}! You joined "${targetWs.name}" via your invitation.`);
        window.history.replaceState({}, document.title, window.location.pathname);
        window.dispatchEvent(new Event("projexa_session_change"));
      }
    }

    setWorkspace(getActiveWorkspace());
    setCurrentUserState(getCurrentUser());
    const handleSessionChange = () => {
      setWorkspace(getActiveWorkspace());
      setCurrentUserState(getCurrentUser());
    };
    window.addEventListener("projexa_session_change", handleSessionChange);
    return () => window.removeEventListener("projexa_session_change", handleSessionChange);
  }, [showToast]);

  const isTeamLead = Boolean(
    currentUser &&
    workspace &&
    (currentUser.email.toLowerCase() === workspace.creatorEmail?.toLowerCase() ||
      currentUser.email.toLowerCase() === workspace.teamLead?.email?.toLowerCase() ||
      currentUser.role === "Owner" ||
      currentUser.name.toLowerCase() === workspace.teamLead?.name?.toLowerCase())
  );

  const load = useCallback(async () => {
    setLoading(true);
    const ws = getActiveWorkspace();
    setWorkspace(ws);
    setCurrentUserState(getCurrentUser());
    const localTasks = getWorkspaceTasks(ws.id);
    if (localTasks && localTasks.length > 0) {
      setTasks(localTasks);
      setLoading(false);
      return;
    }
    try {
      const apiTasks = await api.list();
      if (apiTasks && apiTasks.length > 0) {
        setTasks(apiTasks);
        saveWorkspaceTasks(ws.id, apiTasks);
        setError(null);
        setLoading(false);
        return;
      }
    } catch {}
    setTasks([]);
    if (ws.id) saveWorkspaceTasks(ws.id, []);
    setLoading(false);
  }, [api]);

  useEffect(() => { void load(); }, [load, workspace.id]);

  const assignees = useMemo(() => {
    const fromWorkspace = workspace.members.map((m) => m.name);
    const fromTasks = tasks.flatMap((t) => (t.assigneeId ? [clean(t.assigneeId)] : []));
    return [...new Set([...fromWorkspace, ...fromTasks])].sort();
  }, [workspace.members, tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (assignee === "unassigned") {
        if (t.assigneeId) return false;
      } else if (assignee && clean(t.assigneeId ?? "") !== clean(assignee)) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, search, assignee, statusFilter]);

  const updateStatus = async (id: string, status: TaskStatus) => {
    const previous = tasks.find((t) => t.id === id);
    if (!previous || previous.status === status || saving.has(id)) return;
    const nextTasks = tasks.map((t) => (t.id === id ? { ...t, status } : t));
    setTasks(nextTasks);
    saveWorkspaceTasks(workspace.id, nextTasks);
    setSaving((s) => new Set(s).add(id));
    try {
      await api.update(id, { status });
    } catch {}
    finally {
      setSaving((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const handleDrop = (e: DragEvent<HTMLElement>, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData("text/task-id");
    if (id) void updateStatus(id, status);
  };

  const add = async (s: TaskStatus, t: string, a: string | null, st: string | null, d: string | null): Promise<boolean> => {
    const tempId = `task-${Date.now()}`;
    const now = new Date().toISOString();
    const newTask: Task = { id: tempId, title: t, status: s, assigneeId: a, startDate: st, dueDate: d, dependsOn: [], createdAt: now, updatedAt: now };
    const nextList = [newTask, ...tasks];
    setTasks(nextList);
    saveWorkspaceTasks(workspace.id, nextList);
    try {
      const created = await api.create({ title: t, status: s, assigneeId: a, startDate: st, dueDate: d, dependsOn: [] });
      setTasks((cur) => cur.map((item) => (item.id === tempId ? created : item)));
      saveWorkspaceTasks(workspace.id, nextList.map((item) => (item.id === tempId ? created : item)));
    } catch {}
    return true;
  };

  const remove = async (id: string) => {
    const nextList = tasks.filter((t) => t.id !== id);
    setTasks(nextList);
    saveWorkspaceTasks(workspace.id, nextList);
    try { await api.remove(id); } catch {}
  };

  const displayedColumns = mobileColumnTab === "all" ? columns : columns.filter((c) => c.status === mobileColumnTab);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-[1680px] px-3.5 py-4 sm:px-8 sm:py-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
        <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#0b0f19]" />
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-75 dark:bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] dark:opacity-60" />
      </div>
      <ViewHeader activeView="board" description="Manage work items and track sprint delivery across stages." taskCount={tasks.length} title="Kanban Board" />
      <TaskBoardSprintOverview isTeamLead={isTeamLead} onOpenQuickAdd={() => setQuickAddOpen(true)} onStatusFilterChange={setStatusFilter} statusFilter={statusFilter} tasks={tasks} />
      {toastMessage && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 rounded-xl border border-slate-300 bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur-md text-xs font-medium text-slate-800 dark:border-[#293d5c] dark:bg-[#182338] dark:text-white animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /><span>{toastMessage}</span>
        </div>
      )}
      <TaskBoardFilterBar assignee={assignee} assignees={assignees} filteredCount={filtered.length} hasActiveFilters={Boolean(search || assignee || statusFilter)} mobileColumnTab={mobileColumnTab} onResetFilters={() => { setSearch(""); setAssignee(""); setStatusFilter(""); }} search={search} setAssignee={setAssignee} setMobileColumnTab={setMobileColumnTab} setSearch={setSearch} setStatusFilter={setStatusFilter} statusFilter={statusFilter} totalCount={tasks.length} />
      <div className="flex gap-3 overflow-x-auto pb-6 pt-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:overflow-visible">
        {displayedColumns.map((col) => (
          <TaskBoardColumn
            column={col}
            currentMemberName={currentUser?.name}
            drop={handleDrop}
            isDragOver={dragOverColumn === col.status}
            isSingleMobileView={mobileColumnTab !== "all"}
            isTeamLead={isTeamLead}
            key={col.status}
            onDragLeave={() => setDragOverColumn(null)}
            onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.status); }}
            onStatusChange={updateStatus}
            remove={remove}
            tasks={filtered.filter((t) => t.status === col.status)}
            totalTasks={tasks.length}
          />
        ))}
      </div>
      {quickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs animate-in fade-in" onClick={() => setQuickAddOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <TaskFormModal add={add} close={() => setQuickAddOpen(false)} leadName={workspace.teamLead?.name} members={workspace.members} status="todo" />
          </div>
        </div>
      )}
    </main>
  );
};
