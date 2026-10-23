"use client";

import type { Task, UpdateTaskInput } from "@workspace/types";
import { AlertTriangle, LoaderCircle, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type DragEvent as ReactDragEvent, type ReactElement } from "react";
import {
  ViewHeader,
  getActiveWorkspace,
  getCurrentUser,
  getWorkspaceTasks,
  saveWorkspaceTasks,
  normalizeTaskDates,
  type UserSession,
  type Workspace
} from "@/features/workspace-foundation/public";
import { createTasksApi } from "@/features/tasks/public";
import { createGanttTicks, createGanttWindow, createMonthGroups, toUtcDay, type GanttZoom } from "@/features/gantt-chart/public";
import { calculateAllWorkloads, groupTasksByAssignee } from "./timeline.service";
import { TimelineToolbar } from "./components/timeline-toolbar";
import { TimelinePersonRow } from "./components/timeline-person-row";

type TimelineProps = Readonly<{ apiBaseUrl: string }>;

export const Timeline = ({ apiBaseUrl }: TimelineProps): ReactElement => {
  const api = useMemo(() => createTasksApi(apiBaseUrl), [apiBaseUrl]);
  const [tasks, setTasks] = useState<readonly Task[]>([]);
  const [workspace, setWorkspace] = useState<Workspace>(getActiveWorkspace());
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<GanttZoom>("week");
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverRow, setDragOverRow] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const isTeamLead = Boolean(
    currentUser &&
    workspace &&
    (currentUser.email.toLowerCase() === workspace.creatorEmail?.toLowerCase() ||
      currentUser.email.toLowerCase() === workspace.teamLead?.email?.toLowerCase() ||
      currentUser.role === "Owner")
  );

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const ws = getActiveWorkspace();
    setWorkspace(ws);
    setCurrentUser(getCurrentUser());
    const local = getWorkspaceTasks(ws.id);
    if (local && local.length > 0) {
      setTasks(local.map(normalizeTaskDates));
      setLoading(false);
      return;
    }
    try {
      const apiTasks = await api.list();
      const normalized = (apiTasks || []).map(normalizeTaskDates);
      setTasks(normalized);
      if (ws.id && normalized.length > 0) {
        saveWorkspaceTasks(ws.id, normalized);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    setWorkspace(getActiveWorkspace());
    setCurrentUser(getCurrentUser());
    const handleSession = () => {
      setWorkspace(getActiveWorkspace());
      setCurrentUser(getCurrentUser());
    };
    const handleTasksChange = () => {
      const ws = getActiveWorkspace();
      const local = getWorkspaceTasks(ws.id);
      if (local && local.length > 0) {
        setTasks(local.map(normalizeTaskDates));
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes("projexa_tasks") || e.key.includes("nutsyll_tasks")) {
        const ws = getActiveWorkspace();
        const local = getWorkspaceTasks(ws.id);
        if (local && local.length > 0) {
          setTasks(local.map(normalizeTaskDates));
        }
      }
    };
    window.addEventListener("projexa_session_change", handleSession);
    window.addEventListener("projexa_tasks_change", handleTasksChange);
    window.addEventListener("nutsyll_tasks_change", handleTasksChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("projexa_session_change", handleSession);
      window.removeEventListener("projexa_tasks_change", handleTasksChange);
      window.removeEventListener("nutsyll_tasks_change", handleTasksChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const rows = useMemo(() => groupTasksByAssignee(tasks), [tasks]);
  const ganttWindow = useMemo(() => createGanttWindow(tasks, zoom), [tasks, zoom]);
  const ticks = useMemo(() => createGanttTicks(ganttWindow, zoom), [ganttWindow, zoom]);
  const monthGroups = useMemo(() => createMonthGroups(ticks, zoom), [ticks, zoom]);
  const workloads = useMemo(() => calculateAllWorkloads(rows, ganttWindow), [rows, ganttWindow]);
  const timelineWidth = ganttWindow.totalDays * ganttWindow.pixelsPerDay;
  const todayX = useMemo(
    () => ((toUtcDay(new Date().toISOString()) - ganttWindow.startDay) / 86_400_000) * ganttWindow.pixelsPerDay,
    [ganttWindow]
  );

  const handleDrop = async (event: ReactDragEvent<HTMLElement>, targetPersonId: string | null): Promise<void> => {
    event.preventDefault();
    setDragOverRow(null);
    if (!draggedTask || draggedTask.assigneeId === targetPersonId) { setDraggedTask(null); return; }
    if (!isTeamLead) {
      setError("Permission denied: Only Team Leads can reassign tasks to other team members.");
      setTimeout(() => setError(null), 3000);
      setDraggedTask(null);
      return;
    }
    setSavingTaskId(draggedTask.id);
    const ws = getActiveWorkspace();
    try {
      const input: UpdateTaskInput = { assigneeId: targetPersonId };
      const result = await api.update(draggedTask.id, input);
      setTasks((current) => {
        const updated = new Map([result.task, ...result.rescheduled].map((t) => [t.id, t]));
        const nextTasks = current.map((t) => updated.get(t.id) ?? t);
        saveWorkspaceTasks(ws.id, nextTasks);
        return nextTasks;
      });
    } catch (err) {
      const fallback = tasks.map((t) => (t.id === draggedTask.id ? { ...t, assigneeId: targetPersonId } : t));
      setTasks(fallback);
      saveWorkspaceTasks(ws.id, fallback);
      setError(err instanceof Error ? err.message : "Failed to update task assignee");
    } finally {
      setSavingTaskId(null);
      setDraggedTask(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <AlertTriangle aria-hidden="true" className="size-12 text-destructive" />
        <p className="text-center text-sm text-muted-foreground">{error}</p>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          onClick={() => void load()}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-[1680px] px-3.5 py-4 sm:px-8 sm:py-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
        <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#0b0f19]" />
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-75 dark:bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] dark:opacity-60" />
      </div>
      <ViewHeader
        activeView="timeline"
        description="Track team member capacity, workloads, and task schedules over time."
        taskCount={tasks.length}
        title="Timeline (Workload View)"
      />
      <TimelineToolbar onZoomChange={setZoom} zoom={zoom} />
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden py-2">
        <div className="min-w-fit rounded-2xl border border-slate-300 bg-white/95 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90 animate-in fade-in-50 duration-300 overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: `240px ${timelineWidth}px` }}>
            <div className="sticky left-0 z-20 border-b border-r border-slate-300 bg-slate-50/95 dark:border-slate-700 dark:bg-slate-850/95">
              <div className={`flex items-center px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${zoom === "day" ? "h-20" : "h-12"}`}>
                Team Member
              </div>
            </div>
            <div className="border-b border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/60">
              {zoom === "day" && monthGroups.length > 0 && (
                <div className="relative flex h-10 border-b border-slate-300 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-800/80">
                  {monthGroups.map((group, idx) => (
                    <div
                      className="absolute top-0 flex h-full items-center justify-center border-l border-slate-300 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-200"
                      key={`${group.month}-${group.year}-${idx}`}
                      style={{ left: group.startX, width: group.width }}
                    >
                      {group.month} {group.year}
                    </div>
                  ))}
                </div>
              )}
              <div className={`relative flex ${zoom === "day" ? "h-10" : "h-12"}`}>
                {ticks.map((tick) => (
                  <div
                    className="absolute top-0 flex h-full items-center justify-center border-l border-slate-300 px-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400"
                    key={tick.day}
                    style={{ left: tick.x, width: tick.width }}
                    title={tick.label}
                  >
                    <span className="whitespace-nowrap">{tick.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {rows.map((row, idx) => (
              <TimelinePersonRow
                dragOverRow={dragOverRow}
                ganttWindow={ganttWindow}
                isTeamLead={isTeamLead}
                key={row.person?.id ?? "unassigned"}
                onDragEnd={() => { setDraggedTask(null); setDragOverRow(null); }}
                onDragLeave={() => setDragOverRow(null)}
                onDragOver={(e, pId) => { e.preventDefault(); setDragOverRow(pId); }}
                onDragStart={(t) => setDraggedTask(t)}
                onDrop={handleDrop}
                row={row}
                savingTaskId={savingTaskId}
                ticks={ticks}
                timelineWidth={timelineWidth}
                todayX={todayX}
                workload={workloads[idx]}
              />
            ))}
          </div>
        </div>
      </div>
      <footer className="mt-8 rounded-2xl border border-slate-200/80 bg-white/85 px-6 py-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
        <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-2"><div className="h-3 w-1 rounded-full bg-rose-500" /><span>Today Indicator</span></div>
          <div className="flex items-center gap-2"><div className="size-2.5 rounded-full bg-blue-500" /><span>Active Scheduled Tasks</span></div>
          <div className="flex items-center gap-2"><div className="size-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-900" /><span>Overdue Task Warning</span></div>
          <div className="flex items-center gap-2"><div className="size-2.5 rounded-full bg-rose-500/20 border border-rose-500/60" /><span>Workload Overload Alert (&gt;2 tasks/day)</span></div>
        </div>
      </footer>
    </main>
  );
};
