import type { CreateTaskInput, Task, UpdateTaskInput } from "@workspace/types";
import type { TaskRepository } from "../../features/tasks/index.js";
import { TaskModel, type StoredTask } from "./task.model.js";

type TaskDocument = StoredTask & Readonly<{
  _id: { toString: () => string };
  createdAt: Date;
  updatedAt: Date;
}>;

const toTask = (record: TaskDocument): Task => ({
  id: record._id.toString(),
  title: record.title,
  status: record.status,
  assigneeId: record.assigneeId ?? null,
  startDate: record.startDate?.toISOString() ?? null,
  dueDate: record.dueDate?.toISOString() ?? null,
  dependsOn: record.dependsOn,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString()
});

const toStoredInput = (input: CreateTaskInput | UpdateTaskInput) => {
  const stored: Record<string, unknown> = {};
  if (input.title !== undefined) stored.title = input.title;
  if (input.status !== undefined) stored.status = input.status;
  if (input.assigneeId !== undefined) stored.assigneeId = input.assigneeId;
  if (input.startDate !== undefined) stored.startDate = input.startDate ? new Date(input.startDate) : null;
  if (input.dueDate !== undefined) stored.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.dependsOn !== undefined) stored.dependsOn = Array.from(input.dependsOn);
  return stored;
};

export const createMongoTaskRepository = (): TaskRepository => Object.freeze({
  create: async (input) => toTask(await TaskModel.create(toStoredInput(input)) as TaskDocument),
  list: async () => {
    const records = await TaskModel.find().sort({ createdAt: 1 }).exec();
    return records.map((record) => toTask(record as TaskDocument));
  },
  findById: async (id) => {
    const record = await TaskModel.findById(id).exec();
    return record ? toTask(record) : null;
  },
  update: async (id, input) => {
    const record = await TaskModel.findByIdAndUpdate(id, toStoredInput(input), {
      new: true,
      runValidators: true
    }).exec();
    return record ? toTask(record) : null;
  },
  delete: async (id) => (await TaskModel.findByIdAndDelete(id).exec()) !== null
});
