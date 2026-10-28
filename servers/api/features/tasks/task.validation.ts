import { z } from "zod";
import { TASK_STATUSES } from "@workspace/types";

const dateSchema = z.iso.datetime({ offset: true });
const nullableDateSchema = dateSchema.nullable();

export const createTaskInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  status: z.enum(TASK_STATUSES).default("todo"),
  assigneeId: z.string().trim().min(1).nullable().default(null),
  startDate: nullableDateSchema.default(null),
  dueDate: nullableDateSchema.default(null),
  dependsOn: z.array(z.string().regex(/^[a-f\d]{24}$/i)).default([])
}).superRefine((input, context) => {
  if (input.startDate && input.dueDate && Date.parse(input.dueDate) < Date.parse(input.startDate)) {
    context.addIssue({ code: "custom", path: ["dueDate"], message: "Due date cannot be before start date." });
  }
});

export const updateTaskInputSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  assigneeId: z.string().trim().min(1).nullable().optional(),
  startDate: nullableDateSchema.optional(),
  dueDate: nullableDateSchema.optional(),
  dependsOn: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional()
}).strict().refine((input) => Object.keys(input).length > 0, {
  message: "At least one task field must be provided."
});

export const taskIdSchema = z.string().trim().min(1);
