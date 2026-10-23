import { createServer } from "node:http";
import test from "node:test";
import assert from "node:assert/strict";
import type { Logger } from "@workspace/logging";
import type { CreateTaskInput, Task, UpdateTaskInput } from "@workspace/types";
import express from "express";
import { createTaskRoutes } from "../task.route.js";
import type { TaskRepository } from "../task.repository.js";
import { createErrorHandler } from "../../../middleware/errors.js";

const logger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

const createMemoryRepository = (): TaskRepository => {
  const tasks = new Map<string, Task>();
  return {
    create: async (input: CreateTaskInput) => {
      const created: Task = {
        ...input,
        id: "000000000000000000000001",
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
      const updated = { ...current, ...input };
      tasks.set(id, updated);
      return updated;
    },
    delete: async (id) => tasks.delete(id)
  };
};

void test("task routes validate requests and provide CRUD responses", async (context) => {
  const app = express();
  app.use(express.json());
  app.use(createTaskRoutes({ repository: createMemoryRepository(), persistenceAvailable: true }));
  app.use(createErrorHandler({ logger }));
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  context.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  }));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${String(address.port)}`;

  const invalid = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "   " })
  });
  assert.equal(invalid.status, 400);

  const created = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Release", startDate: "2026-10-14T00:00:00.000Z" })
  });
  assert.equal(created.status, 201);
  const task = await created.json() as Task;
  assert.equal(task.status, "todo");

  const list = await fetch(`${baseUrl}/tasks`);
  assert.equal(list.status, 200);
  assert.equal((await list.json() as Task[]).length, 1);

  const update = await fetch(`${baseUrl}/tasks/${task.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dueDate: "2026-10-15T00:00:00.000Z" })
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json() as { task: Task }).task.dueDate, "2026-10-15T00:00:00.000Z");

  const deleted = await fetch(`${baseUrl}/tasks/${task.id}`, { method: "DELETE" });
  assert.equal(deleted.status, 204);
  const missing = await fetch(`${baseUrl}/tasks/${task.id}`);
  assert.equal(missing.status, 404);
});
