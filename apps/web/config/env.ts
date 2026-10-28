import {
  validateWebEnvironment
} from "@/validation/env.validation";
import type { ValidatedWebEnvironment, WebEnvironmentSource } from "@/types";

export const readWebEnvironment = (
  source: WebEnvironmentSource = process.env
): ValidatedWebEnvironment => {
  const fallback =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://projexa-kanban-gantt-chart-timel-affan-ahmeds-projects-d5fbed2f.vercel.app";

  return validateWebEnvironment({
    NEXT_PUBLIC_API_BASE_URL:
      source.NEXT_PUBLIC_API_BASE_URL ?? (source === process.env ? fallback : undefined)
  });
};
