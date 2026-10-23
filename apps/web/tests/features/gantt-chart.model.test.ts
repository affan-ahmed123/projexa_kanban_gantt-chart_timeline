import test from "node:test";
import assert from "node:assert/strict";
import type { Task } from "@workspace/types";
import {
  createGanttTicks,
  createGanttWindow,
  getDragDayDelta,
  getResizedDates,
  getTaskBarLayout
} from "@/features/gantt-chart";

const task: Task = {
  id: "000000000000000000000001",
  title: "Design",
  status: "in_progress",
  assigneeId: null,
  startDate: "2026-10-14T00:00:00.000Z",
  dueDate: "2026-10-16T00:00:00.000Z",
  dependsOn: [],
  createdAt: "2026-10-13T00:00:00.000Z",
  updatedAt: "2026-10-13T00:00:00.000Z"
};

void test("Gantt bar width covers every scheduled day and zoom changes scale", () => {
  const dayWindow = createGanttWindow([task], "day", new Date("2026-10-14T12:00:00.000Z"));
  const weekWindow = createGanttWindow([task], "week", new Date("2026-10-14T12:00:00.000Z"));
  const layout = getTaskBarLayout(task, dayWindow);
  assert.ok(layout);
  assert.equal(layout.width, 3 * dayWindow.pixelsPerDay);
  assert.equal(getTaskBarLayout(task, weekWindow)?.width, 3 * weekWindow.pixelsPerDay);
  assert.notEqual(dayWindow.pixelsPerDay, weekWindow.pixelsPerDay);
});

void test("Gantt ticks cover the window and unscheduled tasks do not create bars", () => {
  const unscheduled = { ...task, startDate: null, dueDate: null };
  const window = createGanttWindow([unscheduled], "month", new Date("2026-10-14T12:00:00.000Z"));
  const ticks = createGanttTicks(window, "month");
  assert.equal(getTaskBarLayout(unscheduled, window), null);
  assert.ok(ticks.length >= 1);
  assert.equal(ticks[0]?.x, 0);
  assert.ok((ticks.at(-1)?.x ?? 0) + (ticks.at(-1)?.width ?? 0) >= window.totalDays * window.pixelsPerDay);
});

void test("Gantt drag and resize calculations snap to days and never invert a task", () => {
  const window = createGanttWindow([task], "day", new Date("2026-10-14T12:00:00.000Z"));
  assert.equal(getDragDayDelta(window.pixelsPerDay * 2.2, window), 2);
  assert.deepEqual(getResizedDates(task.startDate ?? "", task.dueDate ?? "", "start", 9), {
    startDate: task.dueDate,
    dueDate: task.dueDate
  });
  assert.deepEqual(getResizedDates(task.startDate ?? "", task.dueDate ?? "", "end", -9), {
    startDate: task.startDate,
    dueDate: task.startDate
  });
});
