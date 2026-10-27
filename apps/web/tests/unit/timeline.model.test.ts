import test from "node:test";
import assert from "node:assert/strict";
import type { Task } from "@workspace/types";
import { createGanttWindow } from "@/features/gantt-chart";
import {
  calculateAllWorkloads,
  calculateWorkload,
  detectOverlaps,
  extractAssignees,
  getStackedTaskBarLayout,
  groupTasksByAssignee,
  sortTasksByDate,
  stackOverlappingTasks
} from "@/features/timeline";

const baseTask = (overrides: Partial<Task> & Pick<Task, "id" | "title">): Task => ({
  status: "in_progress",
  assigneeId: null,
  startDate: null,
  dueDate: null,
  dependsOn: [],
  createdAt: "2026-10-13T00:00:00.000Z",
  updatedAt: "2026-10-13T00:00:00.000Z",
  ...overrides
});

const alice = "alice";
const bob = "bob";

const taskA: Task = baseTask({
  id: "a1",
  title: "Task A",
  assigneeId: alice,
  startDate: "2026-10-14T00:00:00.000Z",
  dueDate: "2026-10-16T00:00:00.000Z"
});

const taskB: Task = baseTask({
  id: "b1",
  title: "Task B",
  assigneeId: alice,
  startDate: "2026-10-15T00:00:00.000Z",
  dueDate: "2026-10-18T00:00:00.000Z"
});

const taskC: Task = baseTask({
  id: "c1",
  title: "Task C",
  assigneeId: bob,
  startDate: "2026-10-14T00:00:00.000Z",
  dueDate: "2026-10-15T00:00:00.000Z"
});

const unassignedTask: Task = baseTask({
  id: "u1",
  title: "Unassigned",
  startDate: "2026-10-14T00:00:00.000Z",
  dueDate: "2026-10-14T00:00:00.000Z"
});

void test("extractAssignees returns unique sorted assignee IDs", () => {
  const result = extractAssignees([taskA, taskB, taskC, unassignedTask]);
  assert.deepEqual(result, [alice, bob]);
});

void test("extractAssignees returns empty for no assignees", () => {
  assert.deepEqual(extractAssignees([unassignedTask]), []);
});

void test("groupTasksByAssignee places tasks in correct person rows", () => {
  const rows = groupTasksByAssignee([taskA, taskB, taskC, unassignedTask]);
  assert.equal(rows.length, 3);
  const aliceRow = rows.find((r) => r.person?.id === alice);
  const bobRow = rows.find((r) => r.person?.id === bob);
  const unassignedRow = rows.find((r) => r.person === null);
  assert.ok(aliceRow);
  assert.equal(aliceRow.tasks.length, 2);
  assert.ok(bobRow);
  assert.equal(bobRow.tasks.length, 1);
  assert.ok(unassignedRow);
  assert.equal(unassignedRow.tasks.length, 1);
});

void test("calculateWorkload detects overloaded days", () => {
  const tasks = [taskA, taskB];
  const window = createGanttWindow(tasks, "day", new Date("2026-10-14T12:00:00.000Z"));
  const workload = calculateWorkload(tasks, window, 1);
  const oct15 = workload.find((w) => w.date === "2026-10-15");
  assert.ok(oct15);
  assert.equal(oct15.taskCount, 2);
  assert.equal(oct15.isOverloaded, true);
});


void test("calculateAllWorkloads returns workload for each row", () => {
  const rows = groupTasksByAssignee([taskA, taskB, taskC]);
  const window = createGanttWindow([taskA, taskB, taskC], "day", new Date("2026-10-14T12:00:00.000Z"));
  const workloads = calculateAllWorkloads(rows, window);
  assert.equal(workloads.length, rows.length);
  assert.equal(workloads[0]?.personId, alice);
  assert.equal(workloads[1]?.personId, bob);
});

void test("detectOverlaps finds days with multiple active tasks", () => {
  const tasks = [taskA, taskB];
  const window = createGanttWindow(tasks, "day", new Date("2026-10-14T12:00:00.000Z"));
  const overlaps = detectOverlaps(tasks, window);
  assert.ok(overlaps.length > 0);
});

void test("sortTasksByDate sorts scheduled before unscheduled", () => {
  const noDate = baseTask({ id: "nd", title: "No Date" });
  const sorted = sortTasksByDate([noDate, taskA]);
  assert.equal(sorted[0]?.id, taskA.id);
  assert.equal(sorted[1]?.id, noDate.id);
});

void test("stackOverlappingTasks assigns unique stack positions", () => {
  const tasks = [taskA, taskB];
  const window = createGanttWindow(tasks, "day", new Date("2026-10-14T12:00:00.000Z"));
  const stacked = stackOverlappingTasks(tasks, window);
  assert.equal(stacked.length, 2);
});

void test("getStackedTaskBarLayout returns null for unscheduled tasks", () => {
  const noDate = baseTask({ id: "nd", title: "No Date" });
  const window = createGanttWindow([taskA], "day", new Date("2026-10-14T12:00:00.000Z"));
  const layout = getStackedTaskBarLayout(noDate, window, 0, 1);
  assert.equal(layout, null);
});

void test("getStackedTaskBarLayout returns valid layout for scheduled tasks", () => {
  const window = createGanttWindow([taskA], "day", new Date("2026-10-14T12:00:00.000Z"));
  const layout = getStackedTaskBarLayout(taskA, window, 0, 1);
  assert.ok(layout);
  assert.ok(layout.width > 0);
  assert.equal(layout.top, 0);
  assert.equal(layout.height, 28);
});

void test("sortTasksByDate safely handles corrupted tasks with missing title", () => {
  const corruptedA = { id: "c1", startDate: "2026-10-14T00:00:00.000Z" } as unknown as Task;
  const corruptedB = { id: "c2", startDate: "2026-10-14T00:00:00.000Z", title: "Valid Title" } as unknown as Task;

  assert.doesNotThrow(() => {
    const sorted = sortTasksByDate([corruptedA, corruptedB]);
    assert.equal(sorted.length, 2);
  });
});

void test("groupTasksByAssignee safely groups tasks with whitespace or empty assigneeId into unassigned", () => {
  const whitespaceTask = baseTask({ id: "ws1", title: "Whitespace", assigneeId: "   " as string });
  const nullTask = baseTask({ id: "nl1", title: "Null Assignee", assigneeId: null });
  const validTask = baseTask({ id: "v1", title: "Valid Assignee", assigneeId: "carol" });

  const rows = groupTasksByAssignee([whitespaceTask, nullTask, validTask]);
  const unassigned = rows.find((r) => r.person === null);
  const carolRow = rows.find((r) => r.person?.id === "carol");

  assert.ok(unassigned);
  assert.equal(unassigned.tasks.length, 2);
  assert.ok(carolRow);
  assert.equal(carolRow.tasks.length, 1);
});
