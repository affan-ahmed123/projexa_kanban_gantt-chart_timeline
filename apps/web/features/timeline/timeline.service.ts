import type { Task } from "@workspace/types";
import {
  getTaskBarLayout,
  toUtcDay,
  type GanttWindow,
  type TaskBarLayout
} from "@/features/gantt-chart/public";

export type Person = Readonly<{
  id: string;
  name: string;
  maxTasksPerDay: number;
}>;

export type PersonRow = Readonly<{
  person: Person | null;
  tasks: readonly Task[];
}>;

export type WorkloadDay = Readonly<{
  date: string;
  taskCount: number;
  isOverloaded: boolean;
}>;

export type PersonWorkload = Readonly<{
  personId: string | null;
  days: readonly WorkloadDay[];
}>;

const DAY_MS = 86_400_000;

/**
 * Extract unique assignee IDs from tasks
 */
export const extractAssignees = (tasks: readonly Task[]): readonly string[] => {
  const assigneeIds = new Set<string>();
  for (const task of tasks) {
    const rawKey = typeof task.assigneeId === "string" ? task.assigneeId.trim() : null;
    if (rawKey) {
      assigneeIds.add(rawKey);
    }
  }
  return Array.from(assigneeIds).sort();
};

/**
 * Group tasks by assignee
 */
export const groupTasksByAssignee = (tasks: readonly Task[]): readonly PersonRow[] => {
  const tasksByPerson = new Map<string | null, Task[]>();

  for (const task of tasks) {
    const rawKey = typeof task.assigneeId === "string" ? task.assigneeId.trim() : null;
    const key = rawKey === "" ? null : rawKey;
    const existing = tasksByPerson.get(key) ?? [];
    tasksByPerson.set(key, [...existing, task]);
  }

  const rows: PersonRow[] = [];

  // Add assigned tasks (sorted by person ID)
  const assignedKeys = Array.from(tasksByPerson.keys())
    .filter((key): key is string => key !== null)
    .sort();

  for (const personId of assignedKeys) {
    rows.push({
      person: {
        id: personId,
        name: personId.replace(/::(male|female)$/, ""), // In real app, fetch from team API
        maxTasksPerDay: 2
      },
      tasks: tasksByPerson.get(personId) ?? []
    });
  }

  // Add unassigned section if exists
  const unassigned = tasksByPerson.get(null);
  if (unassigned && unassigned.length > 0) {
    rows.push({
      person: null,
      tasks: unassigned
    });
  }

  return rows;
};

/**
 * Check if a task is active on a given day
 */
export const isTaskActiveOnDay = (task: Task, day: number): boolean => {
  if (!task.startDate || !task.dueDate) return false;
  const startDay = toUtcDay(task.startDate);
  const dueDay = toUtcDay(task.dueDate);
  if (!Number.isFinite(startDay) || !Number.isFinite(dueDay)) return false;
  return day >= startDay && day <= dueDay;
};

/**
 * Calculate workload for each day in the window
 */
export const calculateWorkload = (
  tasks: readonly Task[],
  window: GanttWindow,
  maxTasksPerDay: number
): readonly WorkloadDay[] => {
  const workload: WorkloadDay[] = [];
  const { startDay, totalDays } = window;
  if (!Number.isFinite(startDay) || !Number.isFinite(totalDays) || totalDays <= 0) {
    return workload;
  }

  for (let i = 0; i < totalDays; i++) {
    const day = startDay + i * DAY_MS;
    const taskCount = tasks.filter((task) => isTaskActiveOnDay(task, day)).length;
    const date = new Date(day);

    workload.push({
      date: date.toISOString().slice(0, 10),
      taskCount,
      isOverloaded: taskCount > maxTasksPerDay
    });
  }

  return workload;
};

/**
 * Calculate workload for all persons
 */
export const calculateAllWorkloads = (
  rows: readonly PersonRow[],
  window: GanttWindow
): readonly PersonWorkload[] => {
  return rows.map((row) => ({
    personId: row.person?.id ?? null,
    days: calculateWorkload(
      row.tasks,
      window,
      row.person?.maxTasksPerDay ?? 999
    ).map((d) => ({
      ...d,
      isOverloaded: row.person !== null && d.isOverloaded
    }))
  }));
};

/**
 * Detect overlapping tasks for a person on the same day
 */
export type TaskOverlap = Readonly<{
  day: number;
  tasks: readonly Task[];
}>;

export const detectOverlaps = (
  tasks: readonly Task[],
  window: GanttWindow
): readonly TaskOverlap[] => {
  const { startDay, totalDays } = window;
  if (!Number.isFinite(startDay) || !Number.isFinite(totalDays) || totalDays <= 0) {
    return [];
  }
  const overlaps: TaskOverlap[] = [];

  for (let i = 0; i < totalDays; i++) {
    const day = startDay + i * DAY_MS;
    const activeTasks = tasks.filter((task) => isTaskActiveOnDay(task, day));

    if (activeTasks.length > 1) {
      overlaps.push({
        day,
        tasks: activeTasks
      });
    }
  }

  return overlaps;
};

/**
 * Sort tasks by start date for consistent rendering
 */
export const sortTasksByDate = (tasks: readonly Task[]): readonly Task[] => {
  return [...tasks].sort((a, b) => {
    const aTitle = a.title ?? "Task";
    const bTitle = b.title ?? "Task";
    if (!a.startDate) return b.startDate ? 1 : aTitle.localeCompare(bTitle);
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate) || aTitle.localeCompare(bTitle);
  });
};

/**
 * Calculate stacked positions for overlapping tasks
 */
export type StackedTask = Readonly<{
  task: Task;
  stackIndex: number;
  totalInStack: number;
}>;

export const stackOverlappingTasks = (
  tasks: readonly Task[],
  window: GanttWindow
): readonly StackedTask[] => {
  const sorted = sortTasksByDate(tasks);

  // Simple stacking: each overlapping task gets a stack position
  const { startDay, totalDays } = window;
  if (!Number.isFinite(startDay) || !Number.isFinite(totalDays) || totalDays <= 0) {
    return sorted.map((task) => ({
      task,
      stackIndex: 0,
      totalInStack: 1
    }));
  }
  const positionMap = new Map<string, number>();

  for (let i = 0; i < totalDays; i++) {
    const day = startDay + i * DAY_MS;
    const activeTasks = sorted.filter((task) => isTaskActiveOnDay(task, day));

    activeTasks.forEach((task, index) => {
      if (!positionMap.has(task.id)) {
        positionMap.set(task.id, index);
      }
    });
  }

  const maxStack = Math.max(0, ...Array.from(positionMap.values())) + 1;

  return sorted.map((task) => ({
    task,
    stackIndex: positionMap.get(task.id) ?? 0,
    totalInStack: maxStack
  }));
};

/**
 * Get task bar layout with stacking consideration
 */
export const getStackedTaskBarLayout = (
  task: Task,
  window: GanttWindow,
  stackIndex: number,
  totalInStack: number
): (TaskBarLayout & { top: number; height: number }) | null => {
  const baseLayout = getTaskBarLayout(task, window);
  if (!baseLayout) return null;
  const barHeight = totalInStack > 1 ? 20 : 28;
  const gap = 4;

  return {
    ...baseLayout,
    top: stackIndex * (barHeight + gap),
    height: barHeight
  };
};
