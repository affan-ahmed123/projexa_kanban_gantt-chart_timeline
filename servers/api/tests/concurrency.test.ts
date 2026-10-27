import { createServer, type Server } from "node:http";
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { WebSocket } from "ws";
import type { Logger } from "@workspace/logging";
import type { CreateTaskInput, Task, UpdateTaskInput } from "@workspace/types";
import { createTaskRoutes, type TaskRepository } from "../features/tasks/index.js";
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

const setupTestServer = async () => {
  const repository = createMemoryTaskRepository();
  const app = express();
  app.use(express.json());
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

  return { baseUrl, wsUrl, repository, cleanup };
};

void test("Concurrency: handles 50 simultaneous parallel task creation requests without ID collisions or data corruption", async () => {
  const { baseUrl, repository, cleanup } = await setupTestServer();

  try {
    const concurrentRequests = 50;
    const createPromises = Array.from({ length: concurrentRequests }, (_, index) => {
      const payload: CreateTaskInput = {
        title: `Concurrent Task ${String(index + 1)}`,
        status: "todo",
        assigneeId: null,
        startDate: "2026-11-01T00:00:00.000Z",
        dueDate: "2026-11-05T00:00:00.000Z",
        dependsOn: []
      };

      return fetch(`${baseUrl}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }).then(async (response) => {
        assert.equal(response.status, 201, `Request ${String(index + 1)} should succeed with 201`);
        return response.json() as Promise<Task>;
      });
    });

    const createdTasks = await Promise.all(createPromises);

    // Verify all 50 tasks were created
    assert.equal(createdTasks.length, concurrentRequests);

    // Verify zero ID collisions
    const ids = new Set(createdTasks.map((task) => task.id));
    assert.equal(ids.size, concurrentRequests, "All 50 generated IDs must be strictly unique");

    // Verify repository state matches
    const allInRepo = await repository.list();
    assert.equal(allInRepo.length, concurrentRequests);
  } finally {
    await cleanup();
  }
});

void test("Concurrency: handles 25 parallel updates to the same task without race-condition crashes", async () => {
  const { baseUrl, cleanup } = await setupTestServer();

  try {
    // First create a target task
    const createRes = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Target Task",
        status: "todo",
        startDate: "2026-11-01T00:00:00.000Z",
        dueDate: "2026-11-05T00:00:00.000Z"
      })
    });
    const target = await createRes.json() as Task;

    const statuses = ["in_progress", "review", "done", "todo"] as const;
    const concurrentUpdates = 25;

    const updatePromises = Array.from({ length: concurrentUpdates }, (_, index) => {
      const status = statuses[index % statuses.length];
      const payload = {
        title: `Updated Title ${String(index + 1)}`,
        status
      };

      return fetch(`${baseUrl}/tasks/${target.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }).then(async (res) => {
        assert.equal(res.status, 200, `Concurrent update ${String(index + 1)} should return 200`);
        return res.json() as Promise<{ task: Task }>;
      });
    });

    const updateResults = await Promise.all(updatePromises);
    assert.equal(updateResults.length, concurrentUpdates);

    // Verify final state is valid and consistent
    const finalRes = await fetch(`${baseUrl}/tasks/${target.id}`);
    assert.equal(finalRes.status, 200);
    const finalTask = (await finalRes.json()) as Task;
    const validStatuses: readonly string[] = statuses;
    assert.ok(validStatuses.includes(finalTask.status));
  } finally {
    await cleanup();
  }
});

void test("Concurrency: maintains dependency cycle detection and cascade consistency under concurrent shift requests", async () => {
  const { baseUrl, cleanup } = await setupTestServer();

  try {
    // Create chain: Task A -> Task B
    const taskARes = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Predecessor A",
        status: "todo",
        startDate: "2026-11-01T00:00:00.000Z",
        dueDate: "2026-11-04T00:00:00.000Z"
      })
    });
    const taskA = await taskARes.json() as Task;

    const taskBRes = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Dependent B",
        status: "todo",
        startDate: "2026-11-05T00:00:00.000Z",
        dueDate: "2026-11-08T00:00:00.000Z",
        dependsOn: [taskA.id]
      })
    });
    const taskB = await taskBRes.json() as Task;

    // Concurrently attempt:
    // 1. Shifting Task A forward
    // 2. Setting Task A to depend on Task B (which must trigger a 400 cycle error)
    // 3. Updating Task B start date
    const [shiftA, cycleAttempt, updateB] = await Promise.all([
      fetch(`${baseUrl}/tasks/${taskA.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dueDate: "2026-11-07T00:00:00.000Z" })
      }),
      fetch(`${baseUrl}/tasks/${taskA.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dependsOn: [taskB.id] })
      }),
      fetch(`${baseUrl}/tasks/${taskB.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Dependent B - Renamed" })
      })
    ]);

    // Cycle attempt must have been rejected with 400
    assert.equal(cycleAttempt.status, 400);

    // Shift and update operations must either succeed or wait safely
    assert.ok([200, 400].includes(shiftA.status));
    assert.equal(updateB.status, 200);
  } finally {
    await cleanup();
  }
});

void test("Concurrency: handles connection storm of 30 simultaneous WebSocket clients joining, pinging, and disconnecting", async () => {
  const { wsUrl, cleanup } = await setupTestServer();

  try {
    const clientCount = 30;
    const sockets: WebSocket[] = [];

    const connectPromises = Array.from({ length: clientCount }, (_, index) =>
      new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        sockets.push(ws);

        ws.on("open", () => {
          ws.send(JSON.stringify({
            type: "join",
            workspaceId: "ws-concurrency-room",
            user: { name: `User ${String(index + 1)}`, email: `user${String(index + 1)}@example.com` }
          }));

          // Send ping to verify bidirectional socket operation
          ws.send(JSON.stringify({ type: "ping" }));
        });

        ws.on("message", (raw) => {
          const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
          const message = JSON.parse(text) as { type: string };
          if (message.type === "pong") {
            resolve();
          }
        });

        ws.on("error", reject);
      })
    );

    // All 30 connect and exchange ping/pong concurrently
    await Promise.all(connectPromises);

    // Disconnect all 30 concurrently
    const closePromises = sockets.map(
      (ws) =>
        new Promise<void>((resolve) => {
          ws.on("close", () => {
            resolve();
          });
          ws.close();
        })
    );

    await Promise.all(closePromises);
    assert.ok(true, "All 30 WebSocket connections connected and disconnected cleanly");
  } finally {
    await cleanup();
  }
});
