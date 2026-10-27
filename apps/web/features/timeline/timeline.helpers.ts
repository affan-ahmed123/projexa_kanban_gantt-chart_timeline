import type { TaskStatus } from "@workspace/types";
import type { GanttZoom } from "@/features/gantt-chart/public";

export const getTaskStyle = (status: TaskStatus, isLate: boolean) => {
  if (isLate) {
    return { backgroundColor: "var(--danger-bg)", borderLeftColor: "var(--danger)", borderLeftWidth: "4px" };
  }
  switch (status) {
    case "in_progress":
      return { backgroundColor: "var(--in-progress-bg)", borderLeftColor: "var(--in-progress)", borderLeftWidth: "4px" };
    case "review":
      return { backgroundColor: "var(--review-bg)", borderLeftColor: "var(--review)", borderLeftWidth: "4px" };
    case "done":
      return { backgroundColor: "var(--done-bg)", borderLeftColor: "var(--done)", borderLeftWidth: "4px" };
    case "todo":
    default:
      return { backgroundColor: "var(--todo-bg)", borderLeftColor: "var(--todo)", borderLeftWidth: "4px" };
  }
};

export const TASK_STATUS_CLASSES: Readonly<Record<TaskStatus, string>> = Object.freeze({
  todo: "border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
  in_progress: "border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
  review: "border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
  done: "border transition-all duration-200 opacity-80 line-through"
});

export const zoomLevels: readonly GanttZoom[] = ["day", "week", "month"];

export const dateLabel = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
