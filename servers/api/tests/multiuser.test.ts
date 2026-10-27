import { createServer, type Server } from "node:http";
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { WebSocket } from "ws";
import type { Logger } from "@workspace/logging";
import type { Task } from "@workspace/types";
import { createWebSocketService } from "../integrations/websocket/index.js";

const noopLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

const setupTestWsServer = async () => {
  const app = express();
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

  return { wsUrl, wsService, cleanup };
};

const createConnectedUser = async (
  wsUrl: string,
  workspaceId: string,
  user: { name: string; email: string }
): Promise<{
  ws: WebSocket;
  messages: Array<Record<string, unknown>>;
  waitForMessage: (predicate: (msg: Record<string, unknown>) => boolean, timeoutMs?: number) => Promise<Record<string, unknown>>;
  close: () => Promise<void>;
}> => {
  const ws = new WebSocket(wsUrl);
  const messages: Array<Record<string, unknown>> = [];

  ws.on("message", (raw) => {
    try {
      const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      messages.push(parsed);
    } catch {
      // Ignore non-json messages
    }
  });

  await new Promise<void>((resolve, reject) => {
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "join", workspaceId, user }));
      ws.send(JSON.stringify({ type: "ping" }));
    });

    const onInitialMessage = (raw: unknown) => {
      try {
        const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
        const parsed = JSON.parse(text) as Record<string, unknown>;
        if (parsed.type === "pong") {
          ws.off("message", onInitialMessage);
          resolve();
        }
      } catch {
        // ignore
      }
    };

    ws.on("message", onInitialMessage);
    ws.on("error", reject);
  });

  const waitForMessage = async (
    predicate: (msg: Record<string, unknown>) => boolean,
    timeoutMs = 3000
  ): Promise<Record<string, unknown>> => {
    const existing = messages.find(predicate);
    if (existing) return existing;

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.off("message", listener);
        reject(new Error(`Timed out waiting for message after ${String(timeoutMs)}ms`));
      }, timeoutMs);

      const listener = (raw: unknown) => {
        try {
          const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
          const parsed = JSON.parse(text) as Record<string, unknown>;
          if (predicate(parsed)) {
            clearTimeout(timer);
            ws.off("message", listener);
            resolve(parsed);
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

  return { ws, messages, waitForMessage, close };
};

void test("Multiuser: collaborative real-time sync between Alice and Bob with sender attribution", async () => {
  const { wsUrl, cleanup } = await setupTestWsServer();

  try {
    const workspaceId = "ws-collab-alpha";

    const alice = await createConnectedUser(wsUrl, workspaceId, { name: "Alice", email: "alice@example.com" });
    const bob = await createConnectedUser(wsUrl, workspaceId, { name: "Bob", email: "bob@example.com" });

    const sharedTask: Task = {
      id: "000000000000000000000001",
      title: "Task created by Alice",
      status: "todo",
      assigneeId: null,
      startDate: null,
      dueDate: null,
      dependsOn: [],
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z"
    };

    // Alice broadcasts tasks update
    alice.ws.send(JSON.stringify({
      type: "sync_tasks",
      workspaceId,
      tasks: [sharedTask],
      action: "create"
    }));

    // Bob must receive the update with sender = Alice
    const bobsEvent = await bob.waitForMessage((msg) => msg.type === "tasks_updated");
    assert.equal(bobsEvent.sender, "Alice");
    assert.equal(bobsEvent.workspaceId, workspaceId);
    assert.equal(bobsEvent.action, "create");
    const bobsTasks = bobsEvent.tasks as Task[];
    assert.equal(bobsTasks.length, 1);
    assert.equal(bobsTasks[0]?.title, "Task created by Alice");

    // Alice must NOT receive her own broadcast
    const aliceReceivedOwn = alice.messages.some((msg) => msg.type === "tasks_updated");
    assert.equal(aliceReceivedOwn, false, "Sender must not receive echo of their own broadcast");

    // Bob now updates the task status to in_progress
    const updatedTask: Task = { ...sharedTask, status: "in_progress" };
    bob.ws.send(JSON.stringify({
      type: "sync_tasks",
      workspaceId,
      tasks: [updatedTask],
      action: "status_change"
    }));

    // Alice must receive Bob's update
    const alicesEvent = await alice.waitForMessage((msg) => msg.type === "tasks_updated");
    assert.equal(alicesEvent.sender, "Bob");
    assert.equal(alicesEvent.action, "status_change");
    const alicesTasks = alicesEvent.tasks as Task[];
    assert.equal(alicesTasks[0]?.status, "in_progress");

    await alice.close();
    await bob.close();
  } finally {
    await cleanup();
  }
});

void test("Multiuser: room isolation prevents cross-tenant message leakage between workspaces", async () => {
  const { wsUrl, cleanup } = await setupTestWsServer();

  try {
    // Tenant Alpha: Alice & Bob
    const alice = await createConnectedUser(wsUrl, "ws-finance", { name: "Alice", email: "alice@finance.test" });
    const bob = await createConnectedUser(wsUrl, "ws-finance", { name: "Bob", email: "bob@finance.test" });

    // Tenant Beta: Charlie & Diana
    const charlie = await createConnectedUser(wsUrl, "ws-engineering", { name: "Charlie", email: "charlie@eng.test" });
    const diana = await createConnectedUser(wsUrl, "ws-engineering", { name: "Diana", email: "diana@eng.test" });

    // Alice broadcasts to Finance
    alice.ws.send(JSON.stringify({
      type: "sync_tasks",
      workspaceId: "ws-finance",
      tasks: [{ id: "000000000000000000000001", title: "Confidential Finance Task" }]
    }));

    // Bob (same room) receives it
    const bobsEvent = await bob.waitForMessage((msg) => msg.type === "tasks_updated");
    assert.equal(bobsEvent.workspaceId, "ws-finance");

    // Charlie & Diana (different room) MUST NOT receive it
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(charlie.messages.filter((m) => m.type === "tasks_updated").length, 0);
    assert.equal(diana.messages.filter((m) => m.type === "tasks_updated").length, 0);

    // Charlie broadcasts to Engineering
    charlie.ws.send(JSON.stringify({
      type: "sync_tasks",
      workspaceId: "ws-engineering",
      tasks: [{ id: "000000000000000000000002", title: "Engineering Blueprint" }]
    }));

    // Diana (same room) receives it
    const dianaEvent = await diana.waitForMessage((msg) => msg.type === "tasks_updated");
    assert.equal(dianaEvent.workspaceId, "ws-engineering");

    // Alice & Bob (different room) MUST NOT receive it
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(alice.messages.filter((m) => m.type === "tasks_updated").length, 0);
    assert.equal(bob.messages.filter((m) => m.type === "tasks_updated").length, 1); // only the previous finance one

    await alice.close();
    await bob.close();
    await charlie.close();
    await diana.close();
  } finally {
    await cleanup();
  }
});

void test("Multiuser: workspace switching cleanly migrates client room and delivers cached state", async () => {
  const { wsUrl, cleanup } = await setupTestWsServer();

  try {
    const user = await createConnectedUser(wsUrl, "ws-initial", { name: "Migrating User", email: "user@test.com" });
    const roomPeer = await createConnectedUser(wsUrl, "ws-target", { name: "Target Peer", email: "peer@test.com" });

    // Seed target workspace with cached tasks
    const targetTask: Task = {
      id: "000000000000000000000099",
      title: "Pre-existing target workspace task",
      status: "review",
      assigneeId: null,
      startDate: null,
      dueDate: null,
      dependsOn: [],
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z"
    };

    roomPeer.ws.send(JSON.stringify({
      type: "sync_tasks",
      workspaceId: "ws-target",
      tasks: [targetTask]
    }));

    // Allow cache to be stored
    await new Promise((r) => setTimeout(r, 50));

    // User switches to target workspace
    user.ws.send(JSON.stringify({
      type: "join",
      workspaceId: "ws-target",
      user: { name: "Migrating User", email: "user@test.com" }
    }));

    // User should immediately receive tasks_init with the cached tasks of the new workspace
    const initEvent = await user.waitForMessage((msg) => msg.type === "tasks_init");
    assert.equal(initEvent.workspaceId, "ws-target");
    const initTasks = initEvent.tasks as Task[];
    assert.equal(initTasks[0]?.id, targetTask.id);

    await user.close();
    await roomPeer.close();
  } finally {
    await cleanup();
  }
});

void test("Multiuser: 5 concurrent users in same workspace sending simultaneous updates", async () => {
  const { wsUrl, cleanup } = await setupTestWsServer();

  try {
    const workspaceId = "ws-concurrent-collab";
    const userCount = 5;

    const users = await Promise.all(
      Array.from({ length: userCount }, (_, i) =>
        createConnectedUser(wsUrl, workspaceId, {
          name: `CollabUser ${String(i + 1)}`,
          email: `collab${String(i + 1)}@test.com`
        })
      )
    );

    // Each user broadcasts 1 unique task edit simultaneously
    await Promise.all(
      users.map((user, index) =>
        new Promise<void>((resolve) => {
          user.ws.send(JSON.stringify({
            type: "sync_tasks",
            workspaceId,
            tasks: [{
              id: `00000000000000000000000${String(index + 1)}`,
              title: `Task by User ${String(index + 1)}`,
              status: "todo"
            }],
            action: `edit_${String(index + 1)}`
          }));
          resolve();
        })
      )
    );

    await Promise.all(
      users.map(async (user, userIdx) => {
        const received = await new Promise<number>((resolve) => {
          const timeout = setTimeout(() => {
            resolve(user.messages.filter((m) => m.type === "tasks_updated").length);
          }, 2000);
          const check = () => {
            const count = user.messages.filter((m) => m.type === "tasks_updated").length;
            if (count >= userCount - 1) {
              clearTimeout(timeout);
              resolve(count);
            }
          };
          user.ws.on("message", check);
          check();
        });

        assert.equal(
          received,
          userCount - 1,
          `User ${String(userIdx + 1)} should receive exactly ${String(userCount - 1)} broadcasts from other peers`
        );
      })
    );

    for (const u of users) {
      await u.close();
    }
  } finally {
    await cleanup();
  }
});
