import type { Request, Response } from "express";
import type { UpdateTaskInput } from "@workspace/types";
import { HTTP_STATUS } from "../../constants/index.js";
import type { TaskService } from "./task.service.js";
import { createTaskInputSchema, taskIdSchema, updateTaskInputSchema } from "./task.validation.js";

type TaskControllerDependencies = Readonly<{ service: TaskService }>;
type HttpResponse = Pick<Response, "json" | "send" | "status">;

export const createTaskController = ({ service }: TaskControllerDependencies) => Object.freeze({
  create: async (request: Request, response: HttpResponse): Promise<void> => {
    const input = createTaskInputSchema.parse(request.body);
    const task = await service.create(input);
    response.status(HTTP_STATUS.created).json(task);
  },
  list: async (_request: Request, response: HttpResponse): Promise<void> => {
    response.status(HTTP_STATUS.ok).json(await service.list());
  },
  get: async (request: Request, response: HttpResponse): Promise<void> => {
    const id = taskIdSchema.parse(request.params.taskId);
    response.status(HTTP_STATUS.ok).json(await service.get(id));
  },
  update: async (request: Request, response: HttpResponse): Promise<void> => {
    const id = taskIdSchema.parse(request.params.taskId);
    const rawInput = updateTaskInputSchema.parse(request.body);
    // Filter out undefined values for exactOptionalPropertyTypes
    const input = Object.fromEntries(
      Object.entries(rawInput).filter(([, value]) => value !== undefined)
    ) as UpdateTaskInput;
    response.status(HTTP_STATUS.ok).json(await service.update(id, input));
  },
  delete: async (request: Request, response: HttpResponse): Promise<void> => {
    const id = taskIdSchema.parse(request.params.taskId);
    await service.delete(id);
    response.status(HTTP_STATUS.noContent).send();
  }
});
