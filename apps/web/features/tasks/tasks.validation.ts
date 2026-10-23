import { z } from "zod";
import { TASK_STATUSES, type Task, type TaskUpdateResult } from "@workspace/types";

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  status: z.enum(TASK_STATUSES),
  assigneeId: z.string().nullable(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  dependsOn: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string()
}) satisfies z.ZodType<Task>;

export const taskListSchema = z.array(taskSchema);
export const taskUpdateResultSchema = z.object({
  task: taskSchema,
  rescheduled: z.array(taskSchema),
  conflicts: z.array(z.object({
    taskId: z.string(),
    title: z.string(),
    deadline: z.string(),
    rescheduledDueDate: z.string()
  }))
}) satisfies z.ZodType<TaskUpdateResult>;
