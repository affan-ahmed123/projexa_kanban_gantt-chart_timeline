export const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type Task = Readonly<{
  id: string;
  title: string;
  status: TaskStatus;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
  dependsOn: readonly string[];
  createdAt: string;
  updatedAt: string;
}>;

export type CreateTaskInput = Readonly<{
  title: string;
  status: TaskStatus;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
  dependsOn: readonly string[];
}>;

export type UpdateTaskInput = Readonly<Partial<CreateTaskInput>>;

export type ScheduledTaskConflict = Readonly<{
  taskId: string;
  title: string;
  deadline: string;
  rescheduledDueDate: string;
}>;

export type TaskUpdateResult = Readonly<{
  task: Task;
  rescheduled: readonly Task[];
  conflicts: readonly ScheduledTaskConflict[];
}>;
