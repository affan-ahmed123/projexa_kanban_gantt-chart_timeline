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

export const createTasksApi = (baseUrl?: string, fetcher: typeof fetch = fetch): TasksApi => {
  const resolvedBaseUrl = baseUrl && baseUrl.trim() ? baseUrl : "http://localhost:4000";
  const request = async (path: string, init?: RequestInit): Promise<Response> => {
    const response = await fetcher(new URL(path, `${resolvedBaseUrl.replace(/\/+$/, "")}/`), {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers }
    });
    if (!response.ok) throw await responseError(response);
    return response;
  };
  return Object.freeze({
    list: async () => taskListSchema.parse(await (await request("tasks")).json()),
    create: async (input) => taskSchema.parse(await (await request("tasks", {
      method: "POST",
      body: JSON.stringify(input)
    })).json()),
    update: async (id, input) => taskUpdateResultSchema.parse(await (await request(`tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    })).json()),
    remove: async (id) => {
      await request(`tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
    }
  });
};
