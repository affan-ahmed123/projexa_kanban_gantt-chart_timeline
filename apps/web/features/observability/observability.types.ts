// Telemetry and Health Types for Projexa Observability

export type EndpointTelemetry = {
  path: string;
  status: number;
  ok: boolean;
  latencyMs: number;
};

export type ServerlessInstanceTelemetry = {
  scope: string; // "This Ephemeral Serverless Instance (Single Container)"
  note: string;
  uptimeSeconds: number;
  memoryRssMB: number;
  memoryHeapUsedMB: number;
  memoryHeapTotalMB: number;
  nodeVersion: string;
  region: string;
};

export type MonitoredEndpoints = {
  workspaceTasks: EndpointTelemetry;
  workspaceMembers: EndpointTelemetry;
  workspaceChat: EndpointTelemetry;
  emailConfig: EndpointTelemetry;
};

export type ObservabilityApiResponse = {
  timestamp: string;
  status: "healthy" | "degraded";
  authMode: string;
  thisServerlessInstance: ServerlessInstanceTelemetry;
  endpoints: MonitoredEndpoints;
  activeServerCache: {
    cachedWorkspacesCount: number;
    cachedTaskBuffersCount: number;
  };
};

export type PercentileMetrics = {
  sampleCount: number;
  p50: number | "collecting";
  p95: number | "collecting";
  p99: number | "collecting";
};

export type AuditFeedState = {
  available: boolean;
  message: string;
  events: Array<{
    id: string;
    type: string;
    timestamp: string;
    details?: string;
  }>;
};

export type TelemetryFetchResult =
  | {
      status: "success";
      data: ObservabilityApiResponse;
      percentiles: Record<keyof MonitoredEndpoints, PercentileMetrics>;
      auditFeed: AuditFeedState;
    }
  | {
      status: "needs_key";
      error: string;
    }
  | {
      status: "error";
      error: string;
      statusCode?: number;
    };
