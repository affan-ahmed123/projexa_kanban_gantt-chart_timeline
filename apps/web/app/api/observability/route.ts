import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0"
};

type ServiceProbeResult = {
  status: number;
  ok: boolean;
  latencyMs: number;
};

// Internal endpoint probe to measure real HTTP status and real latency (in milliseconds)
const probeEndpoint = async (url: string): Promise<ServiceProbeResult> => {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
      cache: "no-store"
    });
    const latencyMs = Number((performance.now() - start).toFixed(2));
    return {
      status: res.status,
      ok: res.ok,
      latencyMs
    };
  } catch {
    const latencyMs = Number((performance.now() - start).toFixed(2));
    return {
      status: 0,
      ok: false,
      latencyMs
    };
  }
};

// Constant-time string comparison to prevent timing attacks
const timingSafeKeyCheck = (providedKey: string, expectedKey: string): boolean => {
  const providedBuf = Buffer.from(providedKey, "utf8");
  const expectedBuf = Buffer.from(expectedKey, "utf8");

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
};

// GET endpoint: Observability & System Health telemetry
// Authenticated strictly via server-side OBSERVABILITY_ADMIN_KEY in Authorization header
export async function GET(request: Request) {
  // 1. Strict Environment Key Verification: NO fallback. If missing, route refuses all traffic with 503.
  const adminKey = process.env.OBSERVABILITY_ADMIN_KEY;
  if (!adminKey || adminKey.trim().length === 0) {
    return NextResponse.json(
      {
        error: "Service Unavailable",
        message: "Observability service is disabled. Server administrator must set OBSERVABILITY_ADMIN_KEY in environment variables."
      },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  // 2. Extract Authorization Bearer header
  // Client-controlled headers (x-user-role, x-user-email) are strictly ignored.
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Missing administrator authorization. Header 'Authorization: Bearer <OBSERVABILITY_ADMIN_KEY>' is required."
      },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  const providedKey = authHeader.slice(7).trim();

  // 3. Constant-time key verification via crypto.timingSafeEqual
  if (!timingSafeKeyCheck(providedKey, adminKey.trim())) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Invalid administrator authorization key."
      },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  // 4. Real Service Health Probing via internal requests (Rule 2: Real performance.now() latency)
  const hostUrl = request.headers.get("host")
    ? `${request.headers.get("x-forwarded-proto") || "http"}://${request.headers.get("host")}`
    : "http://localhost:3000";

  const [tasksProbe, membersProbe, chatProbe, emailProbe] = await Promise.all([
    probeEndpoint(`${hostUrl}/api/workspace-tasks?workspaceId=probe-health-check`),
    probeEndpoint(`${hostUrl}/api/workspace-members?workspaceId=probe-health-check`),
    probeEndpoint(`${hostUrl}/api/workspace-chat?workspaceId=probe-health-check`),
    probeEndpoint(`${hostUrl}/api/email-config`)
  ]);

  // 5. Serverless Ephemeral Instance Telemetry (Rule 4: Explicitly labeled for this single container instance)
  const mem = process.memoryUsage();
  const uptimeSec = process.uptime();

  // 6. Aggregated in-memory state counts (Safe metadata only, no secrets or internal disk paths)
  const globalTasks = (globalThis as unknown as { __projexaTasks?: Map<string, unknown> }).__projexaTasks;
  const globalRegistry = (globalThis as unknown as { __projexaWorkspaceRegistry?: Map<string, unknown> }).__projexaWorkspaceRegistry;

  const allHealthy = tasksProbe.ok && membersProbe.ok && chatProbe.ok && emailProbe.ok;

  const responsePayload = {
    timestamp: new Date().toISOString(),
    status: allHealthy ? "healthy" : "degraded",
    authMode: "admin-key",
    // Rule 4: Clearly labeled as this ephemeral serverless container instance only
    thisServerlessInstance: {
      scope: "This Ephemeral Serverless Instance (Single Container)",
      note: "Uptime and memory reflect this active container instance, not global 24/7 cluster uptime.",
      uptimeSeconds: Number(uptimeSec.toFixed(2)),
      memoryRssMB: Number((mem.rss / (1024 * 1024)).toFixed(2)),
      memoryHeapUsedMB: Number((mem.heapUsed / (1024 * 1024)).toFixed(2)),
      memoryHeapTotalMB: Number((mem.heapTotal / (1024 * 1024)).toFixed(2)),
      nodeVersion: process.version,
      region: process.env.VERCEL_REGION || "local-edge"
    },
    // Rule 2: 100% Real measured endpoint response status and latency in ms
    endpoints: {
      workspaceTasks: {
        path: "/api/workspace-tasks",
        ...tasksProbe
      },
      workspaceMembers: {
        path: "/api/workspace-members",
        ...membersProbe
      },
      workspaceChat: {
        path: "/api/workspace-chat",
        ...chatProbe
      },
      emailConfig: {
        path: "/api/email-config",
        status: emailProbe.status,
        ok: emailProbe.ok,
        latencyMs: emailProbe.latencyMs
      }
    },
    // Safe aggregated buffer counts
    activeServerCache: {
      cachedWorkspacesCount: globalRegistry?.size ?? 0,
      cachedTaskBuffersCount: globalTasks?.size ?? 0
    }
  };

  return NextResponse.json(responsePayload, { headers: NO_CACHE_HEADERS });
}
