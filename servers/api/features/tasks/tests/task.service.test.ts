import test from "node:test";
import assert from "node:assert/strict";
import type { CreateTaskInput, Task, UpdateTaskInput } from "@workspace/types";
import { createTaskService } from "../task.service.js";
import type { TaskRepository } from "../task.repository.js";

const task = (
  id: string,
  title: string,
  startDate: string,
  dueDate: string,
  dependsOn: readonly string[] = []
): Task => ({
  id,
  title,
  status: "todo",
  assigneeId: null,
  startDate,
  dueDate,
  dependsOn,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z"
});

const createMemoryRepository = (initialTasks: readonly Task[]): TaskRepository => {
  const tasks = new Map(initialTasks.map((item) => [item.id, item]));
  let nextId = 10;
  return {
    create: async (input: CreateTaskInput) => {
      const created: Task = {
        ...input,
        id: `0000000000000000000000${String(nextId++)}`,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z"
      };
      tasks.set(created.id, created);
      return created;
    },
    list: async () => [...tasks.values()],
    findById: async (id) => tasks.get(id) ?? null,
    update: async (id, input: UpdateTaskInput) => {
      const current = tasks.get(id);
      if (!current) return null;
      const updated = { ...current, ...input, updatedAt: "2026-10-02T00:00:00.000Z" };
      tasks.set(id, updated);
      return updated;
    },
    delete: async (id) => tasks.delete(id)
  };
};

void test("task service auto-reschedules dependent chains and reports deadline conflicts", async () => {
  const firstId = "000000000000000000000001";
  const secondId = "000000000000000000000002";
  const thirdId = "000000000000000000000003";
  const first = task(firstId, "Foundation", "2026-10-13T00:00:00.000Z", "2026-10-15T00:00:00.000Z");
  const second = task(secondId, "Build", "2026-10-15T00:00:00.000Z", "2026-10-16T00:00:00.000Z", [firstId]);
  const third = task(thirdId, "Verify", "2026-10-17T00:00:00.000Z", "2026-10-19T00:00:00.000Z", [secondId]);
  const service = createTaskService({ repository: createMemoryRepository([first, second, third]), persistenceAvailable: true });

  const result = await service.update(firstId, {
    startDate: "2026-10-16T00:00:00.000Z",
    dueDate: "2026-10-18T00:00:00.000Z"
  });

  assert.equal(result.task.dueDate, "2026-10-18T00:00:00.000Z");
  assert.equal(result.rescheduled.find(({ id }) => id === secondId)?.startDate, "2026-10-19T00:00:00.000Z");
  assert.equal(result.rescheduled.find(({ id }) => id === thirdId)?.startDate, "2026-10-21T00:00:00.000Z");
  assert.deepEqual(result.conflicts.map(({ taskId }) => taskId), [secondId, thirdId]);
});

void test("task service rejects circular dependencies, invalid dates, referenced deletion and missing persistence", async () => {
  const firstId = "000000000000000000000001";
  const secondId = "000000000000000000000002";
  const first = task(firstId, "First", "2026-10-14T00:00:00.000Z", "2026-10-15T00:00:00.000Z");
  const second = task(secondId, "Second", "2026-10-16T00:00:00.000Z", "2026-10-17T00:00:00.000Z", [firstId]);
  const service = createTaskService({ repository: createMemoryRepository([first, second]), persistenceAvailable: true });

  await assert.rejects(service.update(firstId, { dependsOn: [secondId] }), { message: /cycle/i });
  await assert.rejects(service.update(firstId, {
    startDate: "2026-10-16T00:00:00.000Z",
    dueDate: "2026-10-15T00:00:00.000Z"
  }), { message: /before start date/i });
  await assert.rejects(service.delete(firstId), { message: /dependent tasks/i });

  const unavailableService = createTaskService({ repository: createMemoryRepository([]), persistenceAvailable: false });
  await assert.rejects(unavailableService.list(), { message: /not configured/i });
});
