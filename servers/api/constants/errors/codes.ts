import type { ApiErrorCode } from "@workspace/types";

export const ERROR_CODES = Object.freeze({
  internal: "internal_error",
  routeNotFound: "route_not_found",
  validation: "validation_error",
  taskNotFound: "task_not_found",
  persistenceUnavailable: "persistence_unavailable"
} as const satisfies Readonly<Record<string, ApiErrorCode>>);
