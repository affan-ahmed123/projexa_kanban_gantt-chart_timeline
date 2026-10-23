import test from "node:test";
import assert from "node:assert/strict";
import type { Task } from "@workspace/types";
import {
  sortTasks,
  mergeUpdatedTasks,
  shiftDateByDays,
  getTaskStyle
} from "../../features/gantt-chart/gantt-chart.helpers";

test("sortTasks sorts scheduled tasks by start date before unscheduled", () => {
  const now = "2026-05-01T00:00:00.000Z";
  const unscheduled: Task = {
    id: "t1",
    title: "Unscheduled",
    status: "todo",
    assigneeId: null,
    startDate: null,
    dueDate: null,
    dependsOn: [],
    createdAt: now,
    updatedAt: now
  };
  const scheduledEarly: Task = {
    id: "t2",
    title: "Early Task",
    status: "in_progress",
    assigneeId: null,
    startDate: "2026-05-01T00:00:00.000Z",
    dueDate: "2026-05-05T00:00:00.000Z",
    dependsOn: [],
    createdAt: now,
    updatedAt: now
  };
  const scheduledLate: Task = {
    id: "t3",
    title: "Late Task",
    status: "todo",
    assigneeId: null,
    startDate: "2026-05-10T00:00:00.000Z",
    dueDate: "2026-05-15T00:00:00.000Z",
    dependsOn: [],
    createdAt: now,
    updatedAt: now
  };

  const sorted = sortTasks([unscheduled, scheduledLate, scheduledEarly]);
  assert.equal(sorted[0]?.id, "t2");
  assert.equal(sorted[1]?.id, "t3");
  assert.equal(sorted[2]?.id, "t1");
});

test("shiftDateByDays accurately shifts ISO string by given days", () => {
  const base = "2026-06-01T10:00:00.000Z";
  const shifted = shiftDateByDays(base, 5);
  assert.equal(shifted.startsWith("2026-06-06"), true);
});

test("mergeUpdatedTasks updates matching tasks in array", () => {
  const now = "2026-05-01T00:00:00.000Z";
  const original: Task[] = [
    { id: "t1", title: "Task 1", status: "todo", assigneeId: null, startDate: null, dueDate: null, dependsOn: [], createdAt: now, updatedAt: now },
    { id: "t2", title: "Task 2", status: "todo", assigneeId: null, startDate: null, dueDate: null, dependsOn: [], createdAt: now, updatedAt: now }
  ];
  const updated: Task = { ...original[0]!, title: "Task 1 Updated", status: "done" };
  const merged = mergeUpdatedTasks(original, updated, []);
  assert.equal(merged[0]?.title, "Task 1 Updated");
  assert.equal(merged[0]?.status, "done");
  assert.equal(merged[1]?.title, "Task 2");
});

test("getTaskStyle returns danger styles when overdue", () => {
  const style = getTaskStyle("in_progress", true);
  assert.equal(style.backgroundColor, "var(--danger-bg)");
});
