import { Router } from "express";
import type { TaskRepository } from "./task.repository.js";
import { createTaskService } from "./task.service.js";
import { createTaskController } from "./task.controller.js";

export type TaskRouteDependencies = Readonly<{
  repository: TaskRepository;
  persistenceAvailable: boolean;
}>;

export const createTaskRoutes = (dependencies: TaskRouteDependencies): Router => {
  const router = Router();
  const service = createTaskService(dependencies);
  const controller = createTaskController({ service });
  router.route("/tasks")
    .post(controller.create)
    .get(controller.list);
  router.route("/tasks/:taskId")
    .get(controller.get)
    .patch(controller.update)
    .delete(controller.delete);
  return router;
};
