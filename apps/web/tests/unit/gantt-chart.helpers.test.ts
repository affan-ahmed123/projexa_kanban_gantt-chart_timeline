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

test("sortTasks safely handles corrupted tasks with undefined title or null dates", () => {
  const corruptedA = { id: "c1", status: "todo", startDate: null } as unknown as Task;
  const corruptedB = { id: "c2", status: "todo", title: "Valid Title", startDate: "2026-05-01T00:00:00.000Z" } as unknown as Task;
  const corruptedC = { id: "c3", status: "todo", startDate: "2026-05-01T00:00:00.000Z" } as unknown as Task;

  assert.doesNotThrow(() => {
    const sorted = sortTasks([corruptedA, corruptedB, corruptedC]);
    assert.equal(sorted.length, 3);
  });
});

test("mergeUpdatedTasks preserves existing task properties when partial update is applied", () => {
  const now = "2026-05-01T00:00:00.000Z";
  const original: Task[] = [
    {
      id: "task-reassign",
      title: "Critical Design Task",
      status: "in_progress",
      assigneeId: "alice",
      startDate: "2026-05-01",
      dueDate: "2026-05-05",
      dependsOn: ["task-prev"],
      createdAt: now,
      updatedAt: now
    }
  ];

  // Simulating partial update from offline/reassign endpoint
  const partialUpdate = { id: "task-reassign", assigneeId: "bob" } as unknown as Task;
  const merged = mergeUpdatedTasks(original, partialUpdate, []);

  assert.equal(merged[0]?.id, "task-reassign");
  assert.equal(merged[0]?.assigneeId, "bob");
  assert.equal(merged[0]?.title, "Critical Design Task");
  assert.equal(merged[0]?.status, "in_progress");
  assert.equal(merged[0]?.startDate, "2026-05-01");
  assert.equal(merged[0]?.dueDate, "2026-05-05");
  assert.deepEqual(merged[0]?.dependsOn, ["task-prev"]);
});
