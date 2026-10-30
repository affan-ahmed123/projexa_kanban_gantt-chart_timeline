import type {
  MonitoredEndpoints,
  ObservabilityApiResponse,
  PercentileMetrics,
  AuditFeedState,
  TelemetryFetchResult
} from "./observability.types";

// Security Rule: Admin key is strictly stored in sessionStorage or memory.
// NEVER stored in localStorage, never passed in query params, never printed to console or errors.
const SESSION_STORAGE_KEY = "projexa_obs_admin_session_key";

let memoryAdminKey: string | null = null;

// Rolling latency sample buffers for p50/p95/p99 computation (minimum 5 samples required)
const latencySamples: Record<keyof MonitoredEndpoints, number[]> = {
  workspaceTasks: [],
  workspaceMembers: [],
  workspaceChat: [],
  emailConfig: []
};

const MAX_SAMPLES_BUFFER = 50;
const MIN_SAMPLES_FOR_PERCENTILES = 5;

export const getStoredAdminKey = (): string | null => {
  if (memoryAdminKey) return memoryAdminKey;
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setStoredAdminKey = (key: string): void => {
  const clean = key.trim();
  memoryAdminKey = clean;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, clean);
    } catch {
      // Memory fallback if sessionStorage is restricted
    }
  }
};

export const clearStoredAdminKey = (): void => {
  memoryAdminKey = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
};

// Calculate percentiles from real collected samples
// Rule: p50/p95/p99 calculated ONLY when sampleCount >= 5, otherwise "collecting"
const calculatePercentiles = (samples: number[]): PercentileMetrics => {
  const count = samples.length;
  if (count < MIN_SAMPLES_FOR_PERCENTILES) {
    return {
      sampleCount: count,
      p50: "collecting",
      p95: "collecting",
      p99: "collecting"
    };
  }

  const sorted = [...samples].sort((a, b) => a - b);

  const getNearestRank = (pct: number): number => {
    const rank = Math.min(count - 1, Math.max(0, Math.ceil((pct / 100) * count) - 1));
    const val = sorted[rank];
    return typeof val === "number" ? Number(val.toFixed(2)) : 0;
  };

  return {
    sampleCount: count,
    p50: getNearestRank(50),
    p95: getNearestRank(95),
    p99: getNearestRank(99)
  };
};

const recordEndpointSample = (endpoint: keyof MonitoredEndpoints, latencyMs: number): void => {
  if (typeof latencyMs !== "number" || isNaN(latencyMs) || latencyMs < 0) return;
  const list = latencySamples[endpoint];
  list.push(Number(latencyMs.toFixed(2)));
  if (list.length > MAX_SAMPLES_BUFFER) {
    list.shift();
  }
};

// Audit Feed Real Source Evaluation:
// Projexa currently stores workspace tasks and chat in-memory / local-first,
// but does not maintain a persistent system audit event log stream.
// Per Rule: If no real source exists, do NOT fake data; report "Data not available".
export const getAuditFeedState = (): AuditFeedState => {
  return {
    available: false,
    message: "Data not available: No persistent audit logging service configured in workspace",
    events: []
  };
};

// Main fetcher for Observability telemetry
export const fetchObservabilityTelemetry = async (
  explicitKey?: string
): Promise<TelemetryFetchResult> => {
  const activeKey = explicitKey?.trim() || getStoredAdminKey();

  if (!activeKey) {
    return {
      status: "needs_key",
      error: "Admin authorization key required to view system telemetry."
    };
  }

  try {
    const res = await fetch("/api/observability", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${activeKey}`,
        "Cache-Control": "no-cache"
      },
      cache: "no-store"
    });

    // Rule: If API returns 401, immediately clear stored key and return 'needs_key' state
    if (res.status === 401) {
      clearStoredAdminKey();
      return {
        status: "needs_key",
        error: "Invalid or expired admin authorization key. Please re-enter the key."
      };
    }

    if (res.status === 503) {
      return {
        status: "error",
        statusCode: 503,
        error: "Observability service is disabled. Server administrator must set OBSERVABILITY_ADMIN_KEY in environment variables."
      };
    }

    if (!res.ok) {
      return {
        status: "error",
        statusCode: res.status,
        error: `Telemetry fetch failed with HTTP status ${res.status} (${res.statusText || "Error"})`
      };
    }

    const data = (await res.json()) as ObservabilityApiResponse;

    // Persist key to sessionStorage only after successful 200 response
    if (explicitKey) {
      setStoredAdminKey(explicitKey);
    }

    // Record real measured latency samples
    if (data.endpoints) {
      recordEndpointSample("workspaceTasks", data.endpoints.workspaceTasks.latencyMs);
      recordEndpointSample("workspaceMembers", data.endpoints.workspaceMembers.latencyMs);
      recordEndpointSample("workspaceChat", data.endpoints.workspaceChat.latencyMs);
      recordEndpointSample("emailConfig", data.endpoints.emailConfig.latencyMs);
    }

    const percentiles: Record<keyof MonitoredEndpoints, PercentileMetrics> = {
      workspaceTasks: calculatePercentiles(latencySamples.workspaceTasks),
      workspaceMembers: calculatePercentiles(latencySamples.workspaceMembers),
      workspaceChat: calculatePercentiles(latencySamples.workspaceChat),
      emailConfig: calculatePercentiles(latencySamples.emailConfig)
    };

    return {
      status: "success",
      data,
      percentiles,
      auditFeed: getAuditFeedState()
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Network error communicating with observability API"
    };
  }
};

// Safe Cache Purge Utility:
// Rule 5: Purges ONLY observability telemetry and sample buffers.
// NEVER clears user workspace data, board tasks, or current session in localStorage!
export const purgeObservabilityCache = (): { success: boolean; clearedSamplesCount: number } => {
  let totalCleared = 0;
  for (const key of Object.keys(latencySamples) as Array<keyof MonitoredEndpoints>) {
    totalCleared += latencySamples[key].length;
    latencySamples[key] = [];
  }

  // Clear session storage key if desired
  clearStoredAdminKey();

  return {
    success: true,
    clearedSamplesCount: totalCleared
  };
};
