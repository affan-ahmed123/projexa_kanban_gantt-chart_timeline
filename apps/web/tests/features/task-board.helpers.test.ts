import test from "node:test";
import assert from "node:assert/strict";
import type { Task } from "@workspace/types";
import { clean, formatDate, isOverdue, columns } from "../../features/task-board/task-board.helpers";

test("clean removes avatar gender suffix from assignee name", () => {
  assert.equal(clean("Affan::male"), "Affan");
  assert.equal(clean("Sarah::female"), "Sarah");
  assert.equal(clean("Alex"), "Alex");
});

test("formatDate formats valid date string", () => {
  const formatted = formatDate("2026-10-22T00:00:00.000Z");
  assert.match(formatted, /2026/);
});

test("isOverdue flags past due tasks that are not done", () => {
  const now = "2026-05-01T00:00:00.000Z";
  const overdueTask: Task = {
    id: "t1",
    title: "Overdue",
    status: "in_progress",
    assigneeId: null,
    startDate: null,
    dueDate: "2020-01-01T00:00:00.000Z",
    dependsOn: [],
    createdAt: now,
    updatedAt: now
  };
  const doneTask: Task = {
    ...overdueTask,
    status: "done"
  };
  const futureTask: Task = {
    ...overdueTask,
    dueDate: "2099-01-01T00:00:00.000Z"
  };

  assert.equal(isOverdue(overdueTask), true);
  assert.equal(isOverdue(doneTask), false);
  assert.equal(isOverdue(futureTask), false);
});

test("columns defines 4 standard kanban stages", () => {
  assert.equal(columns.length, 4);
  assert.deepEqual(columns.map((c) => c.status), ["todo", "in_progress", "review", "done"]);
});
