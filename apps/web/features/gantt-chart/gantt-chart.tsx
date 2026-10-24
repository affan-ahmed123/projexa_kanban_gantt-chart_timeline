"use client";

import type { ScheduledTaskConflict, Task, UpdateTaskInput } from "@workspace/types";
import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type ReactElement } from "react";
import {
  ViewHeader,
  getActiveWorkspace,
  getCurrentUser,
  getWorkspaceTasks,
  saveWorkspaceTasks,
  normalizeTaskDates,
  useWorkspaceSocket,
  type UserSession,
  type Workspace
} from "@/features/workspace-foundation/public";
import { createTasksApi } from "@/features/tasks/public";
import {
  createGanttTicks,
  createGanttWindow,
  createMonthGroups,
  getDragDayDelta,
  getTaskBarLayout,
  toUtcDay,
  type GanttZoom
} from "./gantt-chart.service";
import {
  getPreviewDates,
  mergeUpdatedTasks,
  ROW_HEIGHT,
  sortTasks,
  type Gesture
} from "./gantt-chart.helpers";
import { GanttControls } from "./components/gantt-controls";
import { GanttConflicts } from "./components/gantt-conflicts";
import { GanttTaskBar } from "./components/gantt-task-bar";
import { GanttUnscheduledList } from "./components/gantt-unscheduled-list";

type GanttChartProps = Readonly<{ apiBaseUrl: string }>;

export const GanttChart = ({ apiBaseUrl }: GanttChartProps): ReactElement => {
  const api = useMemo(() => createTasksApi(apiBaseUrl), [apiBaseUrl]);
  const [tasks, setTasks] = useState<readonly Task[]>([]);
  const [workspace, setWorkspace] = useState<Workspace>(getActiveWorkspace());
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<GanttZoom>("week");
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [conflicts, setConflicts] = useState<readonly ScheduledTaskConflict[]>([]);
  const [savingTaskIds, setSavingTaskIds] = useState<ReadonlySet<string>>(() => new Set());

  const isTeamLead = Boolean(
    currentUser &&
    workspace &&
    (currentUser.email.toLowerCase() === workspace.creatorEmail?.toLowerCase() ||
      currentUser.email.toLowerCase() === workspace.teamLead?.email?.toLowerCase())
  );

  const { broadcastTasks } = useWorkspaceSocket({
    workspaceId: workspace.id,
    currentUser,
    apiBaseUrl,
    onTasksUpdated: (newTasks) => setTasks(newTasks)
  });

  const loadTasks = useCallback(async (): Promise<void> => {
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
      const res = await fetch(`/api/workspace-tasks?workspaceId=${encodeURIComponent(ws.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.tasks && data.tasks.length > 0) {
          const normalized = data.tasks.map(normalizeTaskDates);
          setTasks(normalized);
          saveWorkspaceTasks(ws.id, normalized);
          setLoading(false);
          return;
        }
      }
    } catch {}
    try {
      const apiTasks = await api.list();
      const normalized = (apiTasks || []).map(normalizeTaskDates);
      setTasks(normalized);
      if (ws.id && normalized.length > 0) {
        saveWorkspaceTasks(ws.id, normalized);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Schedule could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

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

  const scheduledTasks = useMemo(() => sortTasks(tasks.filter((t) => t.startDate && t.dueDate)), [tasks]);
  const unscheduledTasks = useMemo(() => tasks.filter((t) => !t.startDate || !t.dueDate), [tasks]);
  const ganttWindow = useMemo(() => createGanttWindow(scheduledTasks, zoom), [scheduledTasks, zoom]);
  const ticks = useMemo(() => createGanttTicks(ganttWindow, zoom), [ganttWindow, zoom]);
  const monthGroups = useMemo(() => createMonthGroups(ticks, zoom), [ticks, zoom]);
  const timelineWidth = ganttWindow.totalDays * ganttWindow.pixelsPerDay;
  const scheduleHeight = scheduledTasks.length * ROW_HEIGHT;
  const todayX = ((toUtcDay(new Date().toISOString()) - ganttWindow.startDay) / 86_400_000) * ganttWindow.pixelsPerDay;
  const taskRows = useMemo(() => new Map(scheduledTasks.map((t, idx) => [t.id, idx])), [scheduledTasks]);

  const commitUpdate = async (id: string, input: UpdateTaskInput): Promise<void> => {
    if (savingTaskIds.has(id)) return;
    const previousTasks = tasks;
    setError(null);
    setConflicts([]);
    setSavingTaskIds((current) => new Set(current).add(id));
    const ws = getActiveWorkspace();
    try {
      const result = await api.update(id, input);
      const nextTasks = mergeUpdatedTasks(previousTasks, result.task, result.rescheduled).map(normalizeTaskDates);
      setTasks(nextTasks);
      saveWorkspaceTasks(ws.id, nextTasks);
      broadcastTasks(nextTasks, "gantt_update");
      setConflicts(result.conflicts);
    } catch (cause) {
      const fallback = previousTasks.map((t) => (t.id === id ? normalizeTaskDates({ ...t, ...input } as Task) : t));
      setTasks(fallback);
      saveWorkspaceTasks(ws.id, fallback);
      broadcastTasks(fallback, "gantt_update");
      setError(cause instanceof Error ? cause.message : "Task changes could not be saved.");
    } finally {
      setSavingTaskIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const createDependency = async (predecessor: string, dependent: Task): Promise<void> => {
    if (!isTeamLead) {
      setError("Permission denied: Only Team Leads can configure task dependencies.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (predecessor === dependent.id || dependent.dependsOn.includes(predecessor)) return;
    await commitUpdate(dependent.id, { dependsOn: [...dependent.dependsOn, predecessor] });
  };

  const beginGesture = (e: ReactPointerEvent<HTMLButtonElement>, task: Task, mode: Gesture["mode"]): void => {
    if (!task.startDate || !task.dueDate || savingTaskIds.has(task.id)) return;
    if (!isTeamLead) {
      setError("Permission denied: Only Team Leads can change task schedules in Gantt Chart.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setGesture({ task, mode, pointerId: e.pointerId, initialX: e.clientX, deltaDays: 0 });
  };

  const moveGesture = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    setGesture((current) => current ? { ...current, deltaDays: getDragDayDelta(e.clientX - current.initialX, ganttWindow) } : current);
  };

  const finishGesture = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    const latest = getPreviewDates(gesture);
    const input = gesture.mode === "move" ? latest : gesture.mode === "start" ? { startDate: latest.startDate } : { dueDate: latest.dueDate };
    setGesture(null);
    if (gesture.deltaDays !== 0) void commitUpdate(gesture.task.id, input);
  };

  const barDates = (task: Task) => gesture?.task.id === task.id && gesture ? getPreviewDates(gesture) : (task.startDate && task.dueDate ? { startDate: task.startDate, dueDate: task.dueDate } : null);

  const dependencyPaths = useMemo(() => scheduledTasks.flatMap((task) => {
    const target = getTaskBarLayout(task, ganttWindow);
    const targetRow = taskRows.get(task.id);
    if (!target || targetRow === undefined) return [];
    return task.dependsOn.flatMap((predecessorId: string) => {
      const predecessor = scheduledTasks.find(({ id }) => id === predecessorId);
      const predecessorRow = taskRows.get(predecessorId);
      const source = predecessor ? getTaskBarLayout(predecessor, ganttWindow) : null;
      if (!source || predecessorRow === undefined) return [];
      const fromX = source.left + source.width;
      const toX = target.left;
      const middleX = Math.max(fromX + 10, (fromX + toX) / 2);
      return [{ id: `${predecessorId}-${task.id}`, path: `M ${fromX} ${predecessorRow * ROW_HEIGHT + ROW_HEIGHT / 2} H ${middleX} V ${targetRow * ROW_HEIGHT + ROW_HEIGHT / 2} H ${toX}` }];
    });
  }), [scheduledTasks, taskRows, ganttWindow]);

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-[1680px] px-3.5 py-4 sm:px-8 sm:py-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
        <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#0b0f19]" />
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-75 dark:bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] dark:opacity-60" />
      </div>
      <ViewHeader activeView="gantt" description="Plan dates, follow dependencies, and reschedule work together across time." taskCount={tasks.length} title="Gantt Chart" />
      <GanttControls onZoomChange={setZoom} zoom={zoom} />
      <GanttConflicts conflicts={conflicts} error={error} onRetry={() => void loadTasks()} />
      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Loading schedule…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white/95 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90 animate-in fade-in-50 duration-300">
            <div className="grid min-w-fit" onPointerCancel={(e) => gesture?.pointerId === e.pointerId && setGesture(null)} onPointerMove={moveGesture} onPointerUp={finishGesture} style={{ gridTemplateColumns: `240px ${timelineWidth}px` }}>
              <div className="sticky left-0 z-20 border-b border-r border-slate-300 bg-slate-50/95 dark:border-slate-700 dark:bg-slate-850/95">
                {zoom === "day" && monthGroups.length > 0 && <div className="flex h-10 items-center border-b border-slate-300 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">Timeline</div>}
                <div className={`flex items-center px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${zoom === "day" ? "h-10" : "h-12"}`}>Task Name</div>
              </div>
              <div className="border-b border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/60">
                {zoom === "day" && monthGroups.length > 0 && (
                  <div className="relative flex h-10 border-b border-slate-300 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-800/80">
                    {monthGroups.map((group, idx) => (
                      <div className="absolute top-0 flex h-full items-center justify-center border-l border-slate-300 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-200" key={`${group.month}-${group.year}-${idx}`} style={{ left: group.startX, width: group.width }}>
                        {group.month} {group.year}
                      </div>
                    ))}
                  </div>
                )}
                <div className={`relative flex ${zoom === "day" ? "h-10" : "h-12"}`}>
                  {ticks.map((t) => (
                    <div className="absolute top-0 flex h-full items-center justify-center border-l border-slate-300 px-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400" key={t.day} style={{ left: t.x, width: t.width }} title={t.label}>
                      <span className="whitespace-nowrap">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {scheduledTasks.length === 0 ? (
                <>
                  <div className="sticky left-0 z-10 h-16 border-r border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900" />
                  <div className="flex h-16 items-center px-4 text-sm text-slate-400" style={{ width: timelineWidth }}>Add start and due dates to a task to place it on the schedule.</div>
                </>
              ) : (
                <>
                  <div className="sticky left-0 z-10 bg-white/90 dark:bg-slate-900/90">
                    {scheduledTasks.map((t) => (
                      <div className="flex h-14 items-center border-b border-r border-slate-300 px-4 dark:border-slate-700" key={t.id}>
                        <span className="truncate text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100" title={t.title}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                  <div className="relative touch-pan-x" style={{ height: scheduleHeight, width: timelineWidth }}>
                    {ticks.map((t) => <span aria-hidden="true" className="absolute inset-y-0 border-l border-slate-300/70 dark:border-slate-700/70" key={t.day} style={{ left: t.x }} />)}
                    {todayX >= 0 && todayX <= timelineWidth && <div aria-label="Today" className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" data-testid="today-marker" style={{ left: todayX }} title="Today" />}
                    <svg aria-label="Task dependencies" className="pointer-events-none absolute inset-0 z-20 overflow-visible" height={scheduleHeight} role="img" viewBox={`0 0 ${timelineWidth} ${scheduleHeight}`} width={timelineWidth}>
                      <defs><marker id="gantt-arrow" markerHeight="7" markerWidth="7" orient="auto" refX="5" refY="3.5"><path d="M0,0 L0,7 L6,3.5 z" fill="currentColor" /></marker></defs>
                      {dependencyPaths.map(({ id, path }) => <path className="text-slate-800 dark:text-slate-200" d={path} fill="none" key={id} markerEnd="url(#gantt-arrow)" stroke="currentColor" strokeWidth="1.5" />)}
                    </svg>
                    {scheduledTasks.map((task) => {
                      const baseLayout = getTaskBarLayout(task, ganttWindow);
                      const dates = barDates(task);
                      if (!baseLayout || !dates) return null;
                      const preview = getTaskBarLayout({ ...task, ...dates }, ganttWindow) ?? baseLayout;
                      return (
                        <GanttTaskBar
                          dates={dates}
                          isTeamLead={isTeamLead}
                          key={task.id}
                          layout={preview}
                          onBeginGesture={beginGesture}
                          onDragSource={(e, t) => { e.dataTransfer.setData("text/task-dependency-source", t.id); e.dataTransfer.effectAllowed = "link"; }}
                          onDropDependency={(e, t) => { e.preventDefault(); const src = e.dataTransfer.getData("text/task-dependency-source"); if (src) void createDependency(src, t); }}
                          row={taskRows.get(task.id) ?? 0}
                          task={task}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          <GanttUnscheduledList tasks={unscheduledTasks} />
        </>
      )}
      <footer className="mt-8 rounded-2xl border border-slate-200/80 bg-white/85 px-6 py-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
        <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-2"><div className="h-3 w-1 rounded-full bg-rose-500" /><span>Today Indicator</span></div>
          <div className="flex items-center gap-2"><div className="size-2.5 rounded-full bg-blue-500" /><span>Active Scheduled Tasks</span></div>
          <div className="flex items-center gap-2"><div className="size-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-900" /><span>Overdue Task Warning</span></div>
          <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-slate-900 dark:bg-white" /><span>Dependency Connection Node</span></div>
        </div>
      </footer>
    </main>
  );
};
