import type { CreateTaskInput, Task, UpdateTaskInput } from "@workspace/types";

export type TaskRepository = Readonly<{
  create: (input: CreateTaskInput) => Promise<Task>;
  list: () => Promise<readonly Task[]>;
  findById: (id: string) => Promise<Task | null>;
  update: (id: string, input: UpdateTaskInput) => Promise<Task | null>;
  delete: (id: string) => Promise<boolean>;
}>;
