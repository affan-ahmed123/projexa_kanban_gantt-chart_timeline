import { createServer, type Server } from "node:http";
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { WebSocket } from "ws";
import type { Logger } from "@workspace/logging";
import type { CreateTaskInput, Task, TaskUpdateResult, UpdateTaskInput } from "@workspace/types";
import { createTaskRoutes, type TaskRepository } from "../features/tasks/index.js";
import { createHealthRoutes } from "../features/health/index.js";
import { createErrorHandler } from "../middleware/errors.js";
import { createWebSocketService } from "../integrations/websocket/index.js";

const noopLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

const createMemoryTaskRepository = (): TaskRepository => {
  const tasks = new Map<string, Task>();
  let counter = 1;

  return {
    create: async (input: CreateTaskInput) => {
      const id = counter.toString(16).padStart(24, "0");
      counter += 1;
      const created: Task = {
        ...input,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      tasks.set(id, created);
      return created;
    },
    list: async () => [...tasks.values()],
    findById: async (id: string) => tasks.get(id) ?? null,
    update: async (id: string, input: UpdateTaskInput) => {
      const current = tasks.get(id);
      if (!current) return null;
      const updated: Task = {
        ...current,
        ...input,
        updatedAt: new Date().toISOString()
      };
      tasks.set(id, updated);
      return updated;
    },
    delete: async (id: string) => tasks.delete(id)
  };
};

const setupE2ETestServer = async () => {
  const repository = createMemoryTaskRepository();
  const app = express();
  app.use(express.json());
  app.use(createHealthRoutes({ environment: "test", serviceName: "api" }));
  app.use(createTaskRoutes({ repository, persistenceAvailable: true }));
  app.use(createErrorHandler({ logger: noopLogger }));

  const server: Server = createServer(app);
  const wsService = createWebSocketService({ server, logger: noopLogger });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${String(address.port)}`;
  const wsUrl = `ws://127.0.0.1:${String(address.port)}/ws`;

  const cleanup = async () => {
    await wsService.close();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  };

  return { baseUrl, wsUrl, cleanup };
};

const connectWsUser = async (wsUrl: string, workspaceId: string, name: string) => {
  const ws = new WebSocket(wsUrl);
  const received: Array<Record<string, unknown>> = [];

  ws.on("message", (raw) => {
    try {
      const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
      received.push(JSON.parse(text) as Record<string, unknown>);
    } catch {
      // ignore
    }
  });

  await new Promise<void>((resolve, reject) => {
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "join", workspaceId, user: { name } }));
      ws.send(JSON.stringify({ type: "ping" }));
    });

    const onPong = (raw: unknown) => {
      try {
        const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
        const msg = JSON.parse(text) as { type: string };
        if (msg.type === "pong") {
          ws.off("message", onPong);
          resolve();
        }
      } catch {
        // ignore
      }
    };
    ws.on("message", onPong);
    ws.on("error", reject);
  });

  const waitForEvent = async (type: string, timeoutMs = 3000): Promise<Record<string, unknown>> => {
    const existing = received.find((m) => m.type === type);
    if (existing) return existing;

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.off("message", listener);
        reject(new Error(`Timed out waiting for event "${type}" after ${String(timeoutMs)}ms`));
      }, timeoutMs);

      const listener = (raw: unknown) => {
        try {
          const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
          const msg = JSON.parse(text) as Record<string, unknown>;
          if (msg.type === type) {
            clearTimeout(timer);
            ws.off("message", listener);
            resolve(msg);
          }
        } catch {
          // ignore
        }
      };
      ws.on("message", listener);
    });
  };

  const close = async () => {
    await new Promise<void>((resolve) => {
      ws.on("close", () => {
        resolve();
      });
      ws.close();
    });
  };

  return { ws, received, waitForEvent, close };
};

void test("E2E: complete project management lifecycle from health probe to milestone cascade, multi-user sync, and cleanup", async () => {
  const { baseUrl, wsUrl, cleanup } = await setupE2ETestServer();

  try {
    // 1. Health Probe
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json() as { status: string; service: string };
    assert.equal(healthData.status, "ok");
    assert.equal(healthData.service, "api");

    // 2. Multi-Role Collaboration Session Boot
    const workspaceId = "ws-e2e-project";
    const pmAlice = await connectWsUser(wsUrl, workspaceId, "PM Alice");
    const engBob = await connectWsUser(wsUrl, workspaceId, "Eng Bob");

    // Verify empty initial state
    const initialListRes = await fetch(`${baseUrl}/tasks`);
    assert.equal(initialListRes.status, 200);
    assert.deepEqual(await initialListRes.json(), []);

    // 3. Create Milestone 1 via HTTP
    const createT1Res = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Architecture & Schema Design",
        status: "todo",
        startDate: "2026-11-01T00:00:00.000Z",
        dueDate: "2026-11-03T00:00:00.000Z",
        dependsOn: []
      })
    });
    assert.equal(createT1Res.status, 201);
    const task1 = await createT1Res.json() as Task;
    assert.equal(task1.title, "Architecture & Schema Design");

    // Create Milestone 2 (depends on Task 1)
    const createT2Res = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Backend Services & WebSocket Hub",
        status: "todo",
        startDate: "2026-11-04T00:00:00.000Z",
        dueDate: "2026-11-08T00:00:00.000Z",
        dependsOn: [task1.id]
      })
    });
    assert.equal(createT2Res.status, 201);
    const task2 = await createT2Res.json() as Task;
    assert.deepEqual(task2.dependsOn, [task1.id]);

    // Create Milestone 3 (depends on Task 2)
    const createT3Res = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Frontend Gantt & Kanban Views",
        status: "todo",
        startDate: "2026-11-09T00:00:00.000Z",
        dueDate: "2026-11-14T00:00:00.000Z",
        dependsOn: [task2.id]
      })
    });
    assert.equal(createT3Res.status, 201);
    const task3 = await createT3Res.json() as Task;

    // 4. PM Alice broadcasts initial project plan to WebSocket room
    pmAlice.ws.send(JSON.stringify({
      type: "sync_tasks",
      workspaceId,
      tasks: [task1, task2, task3],
      action: "plan_created"
    }));

    // Eng Bob receives real-time sync with 3 tasks
    const bobPlanEvent = await engBob.waitForEvent("tasks_updated");
    assert.equal(bobPlanEvent.sender, "PM Alice");
    const bobTasks = bobPlanEvent.tasks as Task[];
    assert.equal(bobTasks.length, 3);

    // 5. Eng Bob advances Task 1 through Kanban stages: todo -> in_progress -> done
    const progressRes = await fetch(`${baseUrl}/tasks/${task1.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "in_progress", assigneeId: "bob_lead_dev" })
    });
    assert.equal(progressRes.status, 200);

    const doneRes = await fetch(`${baseUrl}/tasks/${task1.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "done" })
    });
    assert.equal(doneRes.status, 200);
    const completedTask1 = ((await doneRes.json()) as { task: Task }).task;
    assert.equal(completedTask1.status, "done");

    // 6. Cascading Reschedule Flow:
    // Scope change extends Task 1 due date to 2026-11-06 (3 days later)
    const shiftRes = await fetch(`${baseUrl}/tasks/${task1.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dueDate: "2026-11-06T00:00:00.000Z" })
    });
    assert.equal(shiftRes.status, 200);
    const shiftResult = await shiftRes.json() as TaskUpdateResult;

    // Both dependent tasks Task 2 and Task 3 must have been rescheduled
    assert.equal(shiftResult.rescheduled.length, 2);
    const rescheduledT2 = shiftResult.rescheduled.find((t) => t.id === task2.id);
    const rescheduledT3 = shiftResult.rescheduled.find((t) => t.id === task3.id);
    assert.ok(rescheduledT2 && rescheduledT3);
    assert.equal(rescheduledT2.startDate, "2026-11-07T00:00:00.000Z");
    assert.equal(rescheduledT3.startDate, "2026-11-12T00:00:00.000Z");

    // 7. Verify Task Board & Data Integrity via List Endpoint
    const finalListRes = await fetch(`${baseUrl}/tasks`);
    const finalTasks = await finalListRes.json() as Task[];
    assert.equal(finalTasks.length, 3);

    // 8. Relational Guardrail: Cannot delete predecessor Task 1 while dependents exist
    const invalidDeleteRes = await fetch(`${baseUrl}/tasks/${task1.id}`, { method: "DELETE" });
    assert.equal(invalidDeleteRes.status, 400);

    // Clean teardown in reverse dependency order: Task 3 -> Task 2 -> Task 1
    assert.equal((await fetch(`${baseUrl}/tasks/${task3.id}`, { method: "DELETE" })).status, 204);
    assert.equal((await fetch(`${baseUrl}/tasks/${task2.id}`, { method: "DELETE" })).status, 204);
    assert.equal((await fetch(`${baseUrl}/tasks/${task1.id}`, { method: "DELETE" })).status, 204);

    // Verify completely clean workspace
    const emptyListRes = await fetch(`${baseUrl}/tasks`);
    assert.deepEqual(await emptyListRes.json(), []);

    await pmAlice.close();
    await engBob.close();
  } finally {
    await cleanup();
  }
});
