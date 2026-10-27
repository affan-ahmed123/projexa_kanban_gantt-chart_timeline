import type { Task, TaskStatus } from "@workspace/types";
import { getResizedDates } from "./gantt-chart.service";

export type Gesture = Readonly<{
  task: Task;
  mode: "move" | "start" | "end";
  pointerId: number;
  initialX: number;
  deltaDays: number;
}>;

export const ROW_HEIGHT = 56;

export const getTaskStyle = (status: TaskStatus, isLate: boolean) => {
  if (isLate) {
    return { backgroundColor: "var(--danger-bg)", borderLeftColor: "var(--danger)", borderLeftWidth: "4px" };
  }
  switch (status) {
    case "todo":
      return { backgroundColor: "var(--todo-bg)", borderLeftColor: "var(--todo)", borderLeftWidth: "4px" };
    case "in_progress":
      return { backgroundColor: "var(--in-progress-bg)", borderLeftColor: "var(--in-progress)", borderLeftWidth: "4px" };
    case "review":
      return { backgroundColor: "var(--review-bg)", borderLeftColor: "var(--review)", borderLeftWidth: "4px" };
    case "done":
      return { backgroundColor: "var(--done-bg)", borderLeftColor: "var(--done)", borderLeftWidth: "4px" };
  }
};

export const TASK_STATUS_CLASSES: Readonly<Record<TaskStatus, string>> = Object.freeze({
  todo: "border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
  in_progress: "border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
  review: "border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
  done: "border transition-all duration-200 opacity-80 line-through"
});

export const dateLabel = (value: string): string => new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
}).format(new Date(value));

export const sortTasks = (tasks: readonly Task[]): readonly Task[] =>
  [...tasks].sort((left, right) => {
    const leftTitle = left.title ?? "Task";
    const rightTitle = right.title ?? "Task";
    const leftStart = left.startDate ?? "";
    const rightStart = right.startDate ?? "";
    if (!leftStart) return rightStart ? 1 : leftTitle.localeCompare(rightTitle);
    if (!rightStart) return -1;
    return leftStart.localeCompare(rightStart) || leftTitle.localeCompare(rightTitle);
  });

export const mergeUpdatedTasks = (current: readonly Task[], update: Task, rescheduled: readonly Task[]): readonly Task[] => {
  const changed = new Map([update, ...rescheduled].map((task) => [task.id, task]));
  return current.map((task) => {
    const patch = changed.get(task.id);
    return patch ? { ...task, ...patch } : task;
  });
};

export const shiftDateByDays = (value: string, days: number): string => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

export const getPreviewDates = (gesture: Gesture): Readonly<{ startDate: string; dueDate: string }> => {
  const { task, mode, deltaDays } = gesture;
  const startDate = task.startDate ?? "";
  const dueDate = task.dueDate ?? "";
  if (mode === "move") {
    return { startDate: shiftDateByDays(startDate, deltaDays), dueDate: shiftDateByDays(dueDate, deltaDays) };
  }
  return getResizedDates(startDate, dueDate, mode, deltaDays);
};
