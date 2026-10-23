import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TASK_STATUSES } from "@workspace/types";

const taskSchema = new Schema({
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  status: { type: String, enum: TASK_STATUSES, required: true, default: "todo" },
  assigneeId: { type: String, default: null },
  startDate: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  dependsOn: { type: [String], default: [] }
}, { timestamps: true });

export type StoredTask = InferSchemaType<typeof taskSchema>;

const existingTaskModel = mongoose.models.Task as Model<StoredTask> | undefined;
export const TaskModel: Model<StoredTask> = existingTaskModel ?? mongoose.model<StoredTask>("Task", taskSchema);
