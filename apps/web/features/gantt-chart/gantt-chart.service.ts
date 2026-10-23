import type { Task } from "@workspace/types";

export type GanttZoom = "day" | "week" | "month";

export type GanttWindow = Readonly<{
  startDay: number;
  totalDays: number;
  pixelsPerDay: number;
}>;

export type GanttTick = Readonly<{
  day: number;
  x: number;
  width: number;
  label: string;
}>;

export type TaskBarLayout = Readonly<{
  left: number;
  width: number;
}>;

const DAY_MS = 86_400_000;
const pixelsPerDay: Readonly<Record<GanttZoom, number>> = Object.freeze({
  day: 40,
  week: 18,
  month: 5
});

export const toUtcDay = (value: string): number => {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const utcDayString = (day: number): string => new Date(day).toISOString().slice(0, 10);

const startOfWeek = (day: number): number => {
  const weekday = new Date(day).getUTCDay();
  return day - ((weekday + 6) % 7) * DAY_MS;
};

const startOfMonth = (day: number): number => {
  const date = new Date(day);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
};

const addDays = (day: number, count: number): number => {
  const date = new Date(day);
  date.setUTCDate(date.getUTCDate() + count);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const createGanttWindow = (
  tasks: readonly Task[],
  zoom: GanttZoom,
  today = new Date()
): GanttWindow => {
  const scheduled = tasks.filter((task) => task.startDate && task.dueDate);
  const todayDay = toUtcDay(today.toISOString());
  const earliest = scheduled.length > 0
    ? Math.min(...scheduled.map(({ startDate }) => toUtcDay(startDate ?? "")))
    : todayDay;
  const latest = scheduled.length > 0
    ? Math.max(...scheduled.map(({ dueDate }) => toUtcDay(dueDate ?? "")))
    : addDays(todayDay, 14);
  const requestedStart = addDays(earliest, -7);
  const startDay = zoom === "day" ? requestedStart
    : zoom === "week" ? startOfWeek(requestedStart)
      : startOfMonth(requestedStart);
  const requestedEnd = addDays(latest, 8);
  const endDay = zoom === "month"
    ? addDays(startOfMonth(requestedEnd), new Date(requestedEnd).getUTCMonth() === 11
      ? 31
      : new Date(Date.UTC(new Date(requestedEnd).getUTCFullYear(), new Date(requestedEnd).getUTCMonth() + 1, 0)).getUTCDate())
    : zoom === "week" ? addDays(startOfWeek(requestedEnd), 7)
      : requestedEnd;
  return Object.freeze({
    startDay,
    totalDays: Math.max(1, Math.ceil((endDay - startDay) / DAY_MS)),
    pixelsPerDay: pixelsPerDay[zoom]
  });
};

const formatTick = (day: number, zoom: GanttZoom): string => {
  const date = new Date(day);
  if (zoom === "day") {
    return date.getUTCDate().toString();
  }
  if (zoom === "week") {
    const dayNum = date.getUTCDate();
    const month = new Intl.DateTimeFormat(undefined, { month: "short", timeZone: "UTC" }).format(date);
    return `${month} ${dayNum}`;
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
};

export type MonthGroup = Readonly<{
  month: string;
  year: number;
  startX: number;
  width: number;
}>;

export const createMonthGroups = (ticks: readonly GanttTick[], zoom: GanttZoom): readonly MonthGroup[] => {
  if (zoom !== "day") return [];
  
  const groups: MonthGroup[] = [];
  let currentMonth: number | null = null;
  let currentYear: number | null = null;
  let groupStartX = 0;
  
  ticks.forEach((tick, index) => {
    const date = new Date(tick.day);
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    
    if (currentMonth !== month || currentYear !== year) {
      if (currentMonth !== null && currentYear !== null) {
        groups.push(Object.freeze({
          month: new Intl.DateTimeFormat(undefined, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(currentYear, currentMonth, 1))),
          year: currentYear,
          startX: groupStartX,
          width: tick.x - groupStartX
        }));
      }
      currentMonth = month;
      currentYear = year;
      groupStartX = tick.x;
    }
    
    if (index === ticks.length - 1) {
      groups.push(Object.freeze({
        month: new Intl.DateTimeFormat(undefined, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(currentYear, currentMonth, 1))),
        year: currentYear,
        startX: groupStartX,
        width: tick.x + tick.width - groupStartX
      }));
    }
  });
  
  return groups;
};

export const createGanttTicks = (window: GanttWindow, zoom: GanttZoom): readonly GanttTick[] => {
  const ticks: GanttTick[] = [];
  let cursor = window.startDay;
  const end = addDays(window.startDay, window.totalDays);
  while (cursor < end) {
    const next = zoom === "day" ? addDays(cursor, 1)
      : zoom === "week" ? addDays(cursor, 7)
        : Date.UTC(new Date(cursor).getUTCFullYear(), new Date(cursor).getUTCMonth() + 1, 1);
    const tickEnd = Math.min(next, end);
    ticks.push(Object.freeze({
      day: cursor,
      x: ((cursor - window.startDay) / DAY_MS) * window.pixelsPerDay,
      width: ((tickEnd - cursor) / DAY_MS) * window.pixelsPerDay,
      label: formatTick(cursor, zoom)
    }));
    cursor = next;
  }
  return ticks;
};

export const getTaskBarLayout = (task: Task, window: GanttWindow): TaskBarLayout | null => {
  if (!task.startDate || !task.dueDate) return null;
  const start = toUtcDay(task.startDate);
  const due = toUtcDay(task.dueDate);
  if (due < start) return null;
  const left = ((start - window.startDay) / DAY_MS) * window.pixelsPerDay;
  return Object.freeze({
    left,
    width: Math.max(window.pixelsPerDay, ((due - start) / DAY_MS + 1) * window.pixelsPerDay)
  });
};

export const getDragDayDelta = (pixelDelta: number, window: GanttWindow): number =>
  Math.round(pixelDelta / window.pixelsPerDay);

export const shiftDate = (value: string, days: number): string => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

export const getResizedDates = (
  startDate: string,
  dueDate: string,
  edge: "start" | "end",
  dayDelta: number
): Readonly<{ startDate: string; dueDate: string }> => {
  const startDay = toUtcDay(startDate);
  const dueDay = toUtcDay(dueDate);
  if (edge === "start") {
    const movedStart = Math.min(dueDay, addDays(startDay, dayDelta));
    return Object.freeze({ startDate: shiftDate(startDate, (movedStart - startDay) / DAY_MS), dueDate });
  }
  const movedDue = Math.max(startDay, addDays(dueDay, dayDelta));
  return Object.freeze({ startDate, dueDate: shiftDate(dueDate, (movedDue - dueDay) / DAY_MS) });
};
