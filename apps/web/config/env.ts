import {
  validateWebEnvironment
} from "@/validation/env.validation";
import type { ValidatedWebEnvironment, WebEnvironmentSource } from "@/types";

export const readWebEnvironment = (
  source: WebEnvironmentSource = process.env
): ValidatedWebEnvironment => {
  const fallback = "http://localhost:4000";

  return validateWebEnvironment({
    NEXT_PUBLIC_API_BASE_URL:
      source.NEXT_PUBLIC_API_BASE_URL ?? (source === process.env ? fallback : undefined)
  });
};
