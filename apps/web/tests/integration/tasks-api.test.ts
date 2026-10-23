import test from "node:test";
import assert from "node:assert/strict";
import type { CreateTaskInput, Task, TaskUpdateResult } from "@workspace/types";
import { createTasksApi } from "../../features/tasks";

const task: Task = {
  id: "000000000000000000000001",
  title: "Prepare release",
  status: "todo",
  assigneeId: null,
  startDate: "2026-10-14T00:00:00.000Z",
  dueDate: "2026-10-15T00:00:00.000Z",
  dependsOn: [],
  createdAt: "2026-10-13T00:00:00.000Z",
  updatedAt: "2026-10-13T00:00:00.000Z"
};

void test("task API lists, creates, updates and deletes task records", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const updated: TaskUpdateResult = { task: { ...task, status: "done" }, rescheduled: [], conflicts: [] };
  const fetcher: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), ...(init ? { init } : {}) });
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    if (init?.method === "POST") return new Response(JSON.stringify(task), { status: 201 });
    if (init?.method === "PATCH") return new Response(JSON.stringify(updated), { status: 200 });
    return new Response(JSON.stringify([task]), { status: 200 });
  };
  const api = createTasksApi("https://api.example.test/", fetcher);
  const input: CreateTaskInput = {
    title: task.title,
    status: task.status,
    assigneeId: null,
    startDate: task.startDate,
    dueDate: task.dueDate,
    dependsOn: []
  };

  assert.deepEqual(await api.list(), [task]);
  assert.deepEqual(await api.create(input), task);
  assert.deepEqual(await api.update(task.id, { status: "done" }), updated);
  await api.remove(task.id);
  assert.deepEqual(requests.map(({ init }) => init?.method ?? "GET"), ["GET", "POST", "PATCH", "DELETE"]);
  assert.equal(requests[2]?.init?.body, JSON.stringify({ status: "done" }));
  assert.equal(requests[3]?.url, `https://api.example.test/tasks/${task.id}`);
});

void test("task API surfaces server errors and rejects malformed response payloads", async () => {
  const failedApi = createTasksApi("https://api.example.test", async () =>
    new Response(JSON.stringify({ error: { message: "Persistence is offline." } }), { status: 503 })
  );
  await assert.rejects(failedApi.list(), { message: "Persistence is offline." });

  const malformedApi = createTasksApi("https://api.example.test", async () =>
    new Response(JSON.stringify({ unexpected: true }), { status: 200 })
  );
  await assert.rejects(malformedApi.list());
});
