import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0"
};

type ServiceProbeResult<T = unknown> = {
  status: number;
  ok: boolean;
  latencyMs: number;
  data?: T | undefined;
};

// Internal endpoint probe to measure real HTTP status and real latency (in milliseconds)
// const start = performance.now() is defined immediately before fetch
const probeEndpoint = async <T = unknown>(url: string): Promise<ServiceProbeResult<T>> => {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });
    const latencyMs = Number((performance.now() - start).toFixed(2));
    let data: T | undefined = undefined;
    try {
      data = (await res.json()) as T;
    } catch {
      // Body may not be JSON or may be empty
    }
    return {
      status: res.status,
      ok: res.ok,
      latencyMs,
      data
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

  // 4. Base URL: Derived strictly from request.url without headers or hardcoded fallbacks
  const baseUrl = new URL(request.url).origin;

  // 5. Sequential loopback probes (await one after another)
  const tasksProbe = await probeEndpoint(`${baseUrl}/api/workspace-tasks?workspaceId=probe-health-check`);
  const membersProbe = await probeEndpoint(`${baseUrl}/api/workspace-members?workspaceId=probe-health-check`);
  const chatProbe = await probeEndpoint(`${baseUrl}/api/workspace-chat?workspaceId=probe-health-check`);
  const emailProbe = await probeEndpoint<{ isConfigured?: boolean }>(`${baseUrl}/api/email-config`);

  // 6. Serverless Ephemeral Instance Telemetry
  const mem = process.memoryUsage();
  const uptimeSec = process.uptime();

  // 7. Aggregated in-memory state counts
  const globalTasks = (globalThis as unknown as { __projexaTasks?: Map<string, unknown> }).__projexaTasks;
  const globalRegistry = (globalThis as unknown as { __projexaWorkspaceRegistry?: Map<string, unknown> }).__projexaWorkspaceRegistry;

  const allHealthy = tasksProbe.ok && membersProbe.ok && chatProbe.ok && emailProbe.ok;

  // Extract only isConfigured from emailConfig probe body
  const emailIsConfigured = Boolean(emailProbe.data?.isConfigured);

  const responsePayload = {
    timestamp: new Date().toISOString(),
    status: allHealthy ? "healthy" : "degraded",
    authMode: "admin-key",
    probeMode: "sequential loopback",
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
    endpoints: {
      workspaceTasks: {
        path: "/api/workspace-tasks",
        status: tasksProbe.status,
        ok: tasksProbe.ok,
        latencyMs: tasksProbe.latencyMs
      },
      workspaceMembers: {
        path: "/api/workspace-members",
        status: membersProbe.status,
        ok: membersProbe.ok,
        latencyMs: membersProbe.latencyMs
      },
      workspaceChat: {
        path: "/api/workspace-chat",
        status: chatProbe.status,
        ok: chatProbe.ok,
        latencyMs: chatProbe.latencyMs
      },
      emailConfig: {
        path: "/api/email-config",
        status: emailProbe.status,
        ok: emailProbe.ok,
        latencyMs: emailProbe.latencyMs,
        configured: emailIsConfigured,
        configStatus: emailIsConfigured ? "configured" : "not configured"
      }
    },
    activeServerCache: {
      cachedWorkspacesCount: globalRegistry?.size ?? 0,
      cachedTaskBuffersCount: globalTasks?.size ?? 0
    }
  };

  return NextResponse.json(responsePayload, { headers: NO_CACHE_HEADERS });
}

export async function POST() {
  return NextResponse.json(
    { error: "Method Not Allowed" },
    { status: 405, headers: NO_CACHE_HEADERS }
  );
}
