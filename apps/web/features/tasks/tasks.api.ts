import type { CreateTaskInput, Task, TaskUpdateResult, UpdateTaskInput } from "@workspace/types";
import { taskListSchema, taskSchema, taskUpdateResultSchema } from "./tasks.validation";

type TasksApi = Readonly<{
  list: () => Promise<readonly Task[]>;
  create: (input: CreateTaskInput) => Promise<Task>;
  update: (id: string, input: UpdateTaskInput) => Promise<TaskUpdateResult>;
  remove: (id: string) => Promise<void>;
}>;

const responseError = async (response: Response): Promise<Error> => {
  let message = `Task API request failed with status ${response.status}.`;
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      const detail = body.error;
      if (typeof detail === "object" && detail !== null && "message" in detail && typeof detail.message === "string") {
        message = detail.message;
      }
    }
  } catch {
    return new Error(message);
  }
  return new Error(message);
};

let isLocalBackendOffline = false;
let lastOfflineCheck = 0;

export const createTasksApi = (baseUrl?: string, fetcher: typeof fetch = fetch): TasksApi => {
  const isBrowser = typeof window !== "undefined";
  const isRemoteHost = isBrowser && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

  // If in browser on production/Vercel and baseUrl points to localhost, ignore localhost
  const resolvedBaseUrl = (isRemoteHost && (!baseUrl || baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")))
    ? ""
    : (baseUrl && baseUrl.trim() ? baseUrl : "http://localhost:4000");

  const isLocal = resolvedBaseUrl.includes("localhost") || resolvedBaseUrl.includes("127.0.0.1");

  const request = async (path: string, init?: RequestInit): Promise<Response | null> => {
    if (!resolvedBaseUrl) return null;

    // If we already detected localhost:4000 is offline in this browser session, skip calling to prevent console error spam
    if (isBrowser && isLocal && isLocalBackendOffline) {
      if (Date.now() - lastOfflineCheck < 60000) {
        return null;
      }
    }

    try {
      const response = await fetcher(new URL(path, `${resolvedBaseUrl.replace(/\/+$/, "")}/`), {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers }
      });
      if (!response.ok) throw await responseError(response);
      if (isLocal) isLocalBackendOffline = false;
      return response;
    } catch (err) {
      if (isBrowser && isLocal) {
        isLocalBackendOffline = true;
        lastOfflineCheck = Date.now();
      }
      throw err;
    }
  };

  return Object.freeze({
    list: async () => {
      const res = await request("tasks");
      if (!res) return [];
      return taskListSchema.parse(await res.json());
    },
    create: async (input) => {
      const res = await request("tasks", {
        method: "POST",
        body: JSON.stringify(input)
      });
      if (!res) {
        const now = new Date().toISOString();
        return {
          id: `task-${Date.now()}`,
          ...input,
          createdAt: now,
          updatedAt: now
        } as Task;
      }
      return taskSchema.parse(await res.json());
    },
    update: async (id, input) => {
      const res = await request(`tasks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input)
      });
      if (!res) {
        return {
          task: { id, ...input } as unknown as Task,
          rescheduled: [],
          conflicts: []
        };
      }
      return taskUpdateResultSchema.parse(await res.json());
    },
    remove: async (id) => {
      await request(`tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
    }
  });
};
