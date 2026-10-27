import { createServer, type Server } from "node:http";
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { WebSocket } from "ws";
import type { Logger } from "@workspace/logging";
import type { CreateTaskInput, Task, TaskUpdateResult, UpdateTaskInput } from "@workspace/types";
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
  app.use(express.json({ limit: "100kb" }));
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

const calculatePercentile = (sortedValues: readonly number[], percentile: number): number => {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))] ?? 0;
};

void test("Stress: high-volume burst load benchmark measures throughput and latency percentiles", async () => {
  const { baseUrl, cleanup } = await setupTestServer();

  try {
    const totalRequests = 150;
    const batchSize = 15;
    const latencies: number[] = [];
    let successCount = 0;
    let failureCount = 0;

    const overallStartTime = performance.now();

    for (let batchStart = 0; batchStart < totalRequests; batchStart += batchSize) {
      const batchPromises = Array.from({ length: batchSize }, (_, i) => {
        const itemNumber = batchStart + i + 1;
        const reqStart = performance.now();

        return fetch(`${baseUrl}/tasks`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: `Stress Task ${String(itemNumber)}`,
            status: "todo",
            startDate: "2026-11-01T00:00:00.000Z",
            dueDate: "2026-11-05T00:00:00.000Z"
          })
        })
          .then((res) => {
            const reqEnd = performance.now();
            latencies.push(reqEnd - reqStart);
            if (res.status === 201) successCount += 1;
            else failureCount += 1;
          })
          .catch(() => {
            failureCount += 1;
          });
      });

      await Promise.all(batchPromises);
    }

    const overallDurationSec = (performance.now() - overallStartTime) / 1000;
    const throughputRps = totalRequests / Math.max(overallDurationSec, 0.001);

    latencies.sort((a, b) => a - b);
    const minLatency = latencies[0] ?? 0;
    const maxLatency = latencies[latencies.length - 1] ?? 0;
    const sumLatency = latencies.reduce((acc, v) => acc + v, 0);
    const meanLatency = latencies.length > 0 ? sumLatency / latencies.length : 0;
    const p50 = calculatePercentile(latencies, 50);
    const p95 = calculatePercentile(latencies, 95);
    const p99 = calculatePercentile(latencies, 99);

    assert.equal(failureCount, 0, "Stress test must have 0% error rate under load");
    assert.equal(successCount, totalRequests, "All 150 burst requests must succeed");
    assert.ok(p95 < 250, `p95 latency should be under 250ms, was ${p95.toFixed(2)}ms`);

    // Verify benchmark telemetry is valid
    assert.ok(throughputRps > 10, "Throughput must exceed 10 req/s");
    assert.ok(minLatency <= meanLatency && meanLatency <= maxLatency);
    assert.ok(p50 <= p95 && p95 <= p99);
  } finally {
    await cleanup();
  }
});

void test("Stress: deep cascading dependency graph shifts 20 chained tasks efficiently", async () => {
  const { baseUrl, cleanup } = await setupTestServer();

  try {
    const chainDepth = 20;
    const createdTasks: Task[] = [];

    // Create chain: T0 -> T1 -> T2 -> ... -> T19
    for (let i = 0; i < chainDepth; i += 1) {
      const startIso = new Date(Date.UTC(2026, 10, 1 + i * 2, 0, 0, 0)).toISOString();
      const dueIso = new Date(Date.UTC(2026, 10, 2 + i * 2, 0, 0, 0)).toISOString();

      const prevTask = createdTasks[i - 1];
      const payload: CreateTaskInput = {
        title: `Chain Node ${String(i)}`,
        status: "todo",
        assigneeId: null,
        startDate: startIso,
        dueDate: dueIso,
        dependsOn: prevTask ? [prevTask.id] : []
      };

      const res = await fetch(`${baseUrl}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      assert.equal(res.status, 201);
      const created = await res.json() as Task;
      createdTasks.push(created);
    }

    assert.equal(createdTasks.length, chainDepth);

    // Shift root task T0 due date forward by 10 days
    const rootTask = createdTasks[0];
    assert.ok(rootTask);

    const shiftStart = performance.now();
    const updateRes = await fetch(`${baseUrl}/tasks/${rootTask.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dueDate: new Date(Date.UTC(2026, 10, 12, 0, 0, 0)).toISOString()
      })
    });
    const shiftDurationMs = performance.now() - shiftStart;

    assert.equal(updateRes.status, 200);
    const updateResult = await updateRes.json() as TaskUpdateResult;

    // Rescheduling must have propagated down all 19 dependent nodes
    assert.equal(updateResult.rescheduled.length, chainDepth - 1);
    assert.ok(shiftDurationMs < 200, `Deep cascade took ${shiftDurationMs.toFixed(2)}ms (must be < 200ms)`);

    // Verify all subsequent tasks shifted forward to maintain valid start >= predecessor due + 1 day
    const listRes = await fetch(`${baseUrl}/tasks`);
    const allTasks = await listRes.json() as Task[];
    const tasksById = new Map(allTasks.map((t) => [t.id, t]));

    for (let i = 1; i < chainDepth; i += 1) {
      const pred = tasksById.get(createdTasks[i - 1]?.id ?? "");
      const curr = tasksById.get(createdTasks[i]?.id ?? "");
      assert.ok(pred && curr);
      assert.ok(pred.dueDate && curr.startDate);
      const predDue = new Date(pred.dueDate).getTime();
      const currStart = new Date(curr.startDate).getTime();
      assert.ok(currStart >= predDue, `Node ${String(i)} start (${curr.startDate}) must be after predecessor due (${pred.dueDate})`);
    }
  } finally {
    await cleanup();
  }
});

void test("Stress: high-frequency WebSocket broadcast flood delivers 300 messages across multiple clients without loss", async () => {
  const { wsUrl, cleanup } = await setupTestServer();

  try {
    const clientCount = 10;
    const messageBurstCount = 30;
    const sockets: WebSocket[] = [];
    const receivedCounters: number[] = Array.from({ length: clientCount }, () => 0);

    // Connect all 10 clients and ensure each has completed joining before broadcast
    const connectPromises = Array.from({ length: clientCount }, (_, index) =>
      new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        sockets.push(ws);

        ws.on("open", () => {
          ws.send(JSON.stringify({
            type: "join",
            workspaceId: "ws-stress-room",
            user: { name: `Tester ${String(index + 1)}` }
          }));
          ws.send(JSON.stringify({ type: "ping" }));
        });

        ws.on("message", (raw) => {
          const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
          const data = JSON.parse(text) as { type: string };
          if (data.type === "pong") {
            resolve();
          } else if (data.type === "tasks_updated") {
            const current = receivedCounters[index] ?? 0;
            receivedCounters[index] = current + 1;
          }
        });

        ws.on("error", reject);
      })
    );

    await Promise.all(connectPromises);

    // Client 0 fires 30 broadcast updates in a tight loop
    const sender = sockets[0];
    assert.ok(sender);

    for (let i = 0; i < messageBurstCount; i += 1) {
      sender.send(JSON.stringify({
        type: "sync_tasks",
        workspaceId: "ws-stress-room",
        tasks: [
          {
            id: "000000000000000000000001",
            title: `Burst Message ${String(i + 1)}`,
            status: "todo",
            assigneeId: null,
            startDate: null,
            dueDate: null,
            dependsOn: [],
            createdAt: "2026-10-01T00:00:00.000Z",
            updatedAt: "2026-10-01T00:00:00.000Z"
          }
        ]
      }));
    }

    // Wait for all messages to be delivered across other 9 sockets
    const expectedPerListener = messageBurstCount;
    const maxWaitMs = 5000;
    const pollIntervalMs = 50;
    const startWait = performance.now();

    while (performance.now() - startWait < maxWaitMs) {
      // Check listeners 1..9 (sender doesn't receive its own broadcast)
      const allReceived = receivedCounters.slice(1).every((count) => count === expectedPerListener);
      if (allReceived) break;
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    // Verify all 9 listeners received every single broadcast message (9 * 30 = 270 deliveries)
    for (let i = 1; i < clientCount; i += 1) {
      assert.equal(
        receivedCounters[i],
        messageBurstCount,
        `Client ${String(i)} should receive exactly ${String(messageBurstCount)} broadcast events`
      );
    }

    for (const ws of sockets) {
      ws.close();
    }
  } finally {
    await cleanup();
  }
});
