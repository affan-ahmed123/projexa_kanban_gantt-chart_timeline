import type {
  CreateTaskInput,
  ScheduledTaskConflict,
  Task,
  TaskUpdateResult,
  UpdateTaskInput
} from "@workspace/types";
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from "../../constants/index.js";
import { createApplicationError } from "../../errors/application-error.js";
import type { TaskRepository } from "./task.repository.js";

type TaskServiceDependencies = Readonly<{
  repository: TaskRepository;
  persistenceAvailable: boolean;
}>;

export type TaskService = Readonly<{
  create: (input: CreateTaskInput) => Promise<Task>;
  list: () => Promise<readonly Task[]>;
  get: (id: string) => Promise<Task>;
  update: (id: string, input: UpdateTaskInput) => Promise<TaskUpdateResult>;
  delete: (id: string) => Promise<void>;
}>;

const validationError = (message: string, details?: Readonly<Record<string, unknown>>) =>
  createApplicationError({
    code: ERROR_CODES.validation,
    message,
    status: HTTP_STATUS.badRequest,
    ...(details ? { details } : {})
  });

const taskNotFoundError = (id: string) => createApplicationError({
  code: ERROR_CODES.taskNotFound,
  message: ERROR_MESSAGES.taskNotFound,
  status: HTTP_STATUS.notFound,
  details: { id }
});

const hasCycle = (taskId: string, dependencies: readonly string[], tasks: readonly Task[]): boolean => {
  const dependenciesById = new Map(tasks.map((task) => [task.id, task.dependsOn]));
  const visited = new Set<string>();
  const pending = [...dependencies];
  while (pending.length > 0) {
    const dependencyId = pending.pop();
    if (!dependencyId) continue;
    if (dependencyId === taskId) return true;
    if (visited.has(dependencyId)) continue;
    visited.add(dependencyId);
    pending.push(...(dependenciesById.get(dependencyId) ?? []));
  }
  return false;
};

const assertDependenciesExist = (dependencies: readonly string[], tasks: readonly Task[]): void => {
  const taskIds = new Set(tasks.map((task) => task.id));
  const missingIds = dependencies.filter((id) => !taskIds.has(id));
  if (missingIds.length > 0) {
    throw validationError("Every dependency must reference an existing task.", { missingIds });
  }
};

const addUtcDays = (value: string, days: number): string => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

const utcDay = (value: string): number => {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const shiftIfRequired = (task: Task, predecessorDueDate: string): Readonly<{
  input: UpdateTaskInput;
  conflict?: ScheduledTaskConflict;
}> | null => {
  if (!task.startDate || !task.dueDate || utcDay(task.startDate) >= utcDay(addUtcDays(predecessorDueDate, 1))) {
    return null;
  }
  const shiftDays = Math.round((utcDay(addUtcDays(predecessorDueDate, 1)) - utcDay(task.startDate)) / 86_400_000);
  const dueDate = addUtcDays(task.dueDate, shiftDays);
  return {
    input: { startDate: addUtcDays(task.startDate, shiftDays), dueDate },
    ...(utcDay(dueDate) > utcDay(task.dueDate)
      ? { conflict: { taskId: task.id, title: task.title, deadline: task.dueDate, rescheduledDueDate: dueDate } }
      : {})
  };
};

export const createTaskService = ({
  repository,
  persistenceAvailable
}: TaskServiceDependencies): TaskService => {
  const ensurePersistence = (): void => {
    if (!persistenceAvailable) {
      throw createApplicationError({
        code: ERROR_CODES.persistenceUnavailable,
        message: ERROR_MESSAGES.persistenceUnavailable,
        status: HTTP_STATUS.serviceUnavailable
      });
    }
  };

  return Object.freeze({
    create: async (input) => {
      ensurePersistence();
      const tasks = await repository.list();
      assertDependenciesExist(input.dependsOn, tasks);
      return repository.create(input);
    },
    list: async () => {
      ensurePersistence();
      return repository.list();
    },
    get: async (id) => {
      ensurePersistence();
      const task = await repository.findById(id);
      if (!task) throw taskNotFoundError(id);
      return task;
    },
    update: async (id, input) => {
      ensurePersistence();
      const currentTask = await repository.findById(id);
      if (!currentTask) throw taskNotFoundError(id);
      const tasks = await repository.list();
      const nextDependencies = input.dependsOn ?? currentTask.dependsOn;
      assertDependenciesExist(nextDependencies, tasks);
      if (hasCycle(id, nextDependencies, tasks)) {
        throw validationError("Task dependencies cannot contain a cycle.", { id, dependsOn: nextDependencies });
      }
      const nextStartDate = input.startDate === undefined ? currentTask.startDate : input.startDate;
      const nextDueDate = input.dueDate === undefined ? currentTask.dueDate : input.dueDate;
      if (nextStartDate && nextDueDate && Date.parse(nextDueDate) < Date.parse(nextStartDate)) {
        throw validationError("Due date cannot be before start date.", { field: "dueDate" });
      }

      const task = await repository.update(id, input);
      if (!task) throw taskNotFoundError(id);
      const changedSchedule = input.startDate !== undefined || input.dueDate !== undefined || input.dependsOn !== undefined;
      if (!changedSchedule) return { task, rescheduled: [], conflicts: [] };

      const updatedById = new Map<string, Task>([[task.id, task]]);
      const pending = [task];
      const visited = new Set<string>([task.id]);
      const conflicts: ScheduledTaskConflict[] = [];
      while (pending.length > 0) {
        const predecessor = pending.shift();
        if (!predecessor) continue;
        const latestPredecessor = updatedById.get(predecessor.id) ?? predecessor;
        for (const candidate of tasks) {
          if (!candidate.dependsOn.includes(latestPredecessor.id) || visited.has(candidate.id)) continue;
          visited.add(candidate.id);
          let dependent = candidate;
          if (latestPredecessor.dueDate) {
            const schedule = shiftIfRequired(candidate, latestPredecessor.dueDate);
            if (schedule) {
              const rescheduledTask = await repository.update(candidate.id, schedule.input);
              if (!rescheduledTask) throw taskNotFoundError(candidate.id);
              dependent = rescheduledTask;
              updatedById.set(dependent.id, dependent);
              if (schedule.conflict) conflicts.push(schedule.conflict);
            }
          }
          pending.push(dependent);
        }
      }
      const rescheduled = [...updatedById.values()].filter(({ id: taskId }) => taskId !== task.id);
      return { task, rescheduled, conflicts } satisfies TaskUpdateResult;
    },
    delete: async (id) => {
      ensurePersistence();
      const tasks = await repository.list();
      const dependents = tasks.filter(({ dependsOn }) => dependsOn.includes(id));
      if (dependents.length > 0) {
        throw validationError("A task with dependent tasks cannot be deleted.", {
          dependentIds: dependents.map(({ id: dependentId }) => dependentId)
        });
      }
      if (!await repository.delete(id)) throw taskNotFoundError(id);
    }
  });
};
