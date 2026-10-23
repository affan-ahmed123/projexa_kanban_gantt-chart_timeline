import type { Task, TaskStatus } from "@workspace/types";

export type Column = {
  status: TaskStatus;
  title: string;
  dotColor: string;
  badgeBg: string;
  delayClass: string;
};

export const columns: Column[] = [
  {
    status: "todo",
    title: "To Do",
    dotColor: "bg-blue-500",
    badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800",
    delayClass: "delay-75"
  },
  {
    status: "in_progress",
    title: "In Progress",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
    delayClass: "delay-150"
  },
  {
    status: "review",
    title: "In Review",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
    delayClass: "delay-200"
  },
  {
    status: "done",
    title: "Completed",
    dotColor: "bg-purple-500",
    badgeBg: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800",
    delayClass: "delay-300"
  }
];

export const statusBadgeConfig: Record<
  TaskStatus,
  { label: string; badge: string; accentBorder: string; dotColor: string }
> = {
  todo: {
    label: "To Do",
    badge: "bg-blue-50/90 text-blue-700 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    accentBorder: "border-l-blue-500",
    dotColor: "bg-blue-500"
  },
  in_progress: {
    label: "In Progress",
    badge: "bg-emerald-50/90 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    accentBorder: "border-l-emerald-500",
    dotColor: "bg-emerald-500"
  },
  review: {
    label: "In Review",
    badge: "bg-amber-50/90 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    accentBorder: "border-l-amber-500",
    dotColor: "bg-amber-500"
  },
  done: {
    label: "Completed",
    badge: "bg-purple-50/90 text-purple-700 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
    accentBorder: "border-l-purple-500",
    dotColor: "bg-purple-500"
  }
};

export const clean = (v: string): string => v.replace(/::(male|female)$/, "");

export const formatDate = (v: string): string =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(v)
  );

export const isOverdue = (t: Task): boolean =>
  t.status !== "done" && !!t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString());
