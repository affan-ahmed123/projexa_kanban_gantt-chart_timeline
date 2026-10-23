export const ERROR_MESSAGES = Object.freeze({
  internal: "An unexpected error occurred.",
  routeNotFound: "Route was not found.",
  validation: "Request validation failed.",
  taskNotFound: "Task was not found.",
  persistenceUnavailable: "Task persistence is not configured."
} as const);
