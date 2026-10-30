"use client";

import { useState, useEffect, useCallback, useRef, type ReactElement } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldAlert,
  Sliders,
  Users
} from "lucide-react";
import {
  fetchObservabilityTelemetry,
  clearStoredAdminKey,
  getStoredAdminKey,
  purgeObservabilityCache
} from "../observability.service";
import type {
  TelemetryFetchResult,
  MonitoredEndpoints,
  PercentileMetrics,
  EndpointTelemetry
} from "../observability.types";
import { AdminKeyPrompt } from "./admin-key-prompt";
import { SmtpSettingsModal } from "@/features/workspace-foundation/components/smtp-settings-modal";

const POLLING_INTERVAL_MS = 15000;

export const ServiceHealthGrid = (): ReactElement => {
  const [fetchResult, setFetchResult] = useState<TelemetryFetchResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [smtpModalOpen, setSmtpModalOpen] = useState(false);

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTabVisibleRef = useRef<boolean>(true);

  // Fetch telemetry helper
  const loadTelemetry = useCallback(async (explicitKey?: string) => {
    setIsRefreshing(true);
    try {
      const result = await fetchObservabilityTelemetry(explicitKey);
      setFetchResult(result);
      if (result.status === "success") {
        setLastRefreshedAt(new Date());
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleResetSamples = () => {
    purgeObservabilityCache();
    loadTelemetry();
  };

  // Polling setup with tab visibility pause and needs_key stop
  useEffect(() => {
    // 1. Initial load
    const storedKey = getStoredAdminKey();
    if (storedKey) {
      loadTelemetry(storedKey);
    } else {
      setFetchResult({
        status: "needs_key",
        error: "Server administrator authorization key required."
      });
    }

    // 2. Tab visibility tracking
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      isTabVisibleRef.current = visible;
      if (visible && fetchResult?.status === "success") {
        // Resume polling immediately with a fresh probe on tab focus
        loadTelemetry();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [loadTelemetry]);

  // Polling interval management: Har 15 sec, tab hidden pe pause, needs_key pe band
  useEffect(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    // Polling band if needs_key or error state
    if (fetchResult?.status !== "success") {
      return;
    }

    pollingTimerRef.current = setInterval(() => {
      // Tab hidden ho to pause
      if (!isTabVisibleRef.current) return;
      loadTelemetry();
    }, POLLING_INTERVAL_MS);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [fetchResult?.status, loadTelemetry]);

  // 401 / manual sign out handler: clear key and show prompt
  const handleLockDashboard = () => {
    clearStoredAdminKey();
    setFetchResult({
      status: "needs_key",
      error: "Session closed. Please enter your administrator key to reconnect."
    });
  };

  // If needs_key: stop polling and render AdminKeyPrompt
  if (!fetchResult || fetchResult.status === "needs_key") {
    return (
      <AdminKeyPrompt
        errorMessage={fetchResult?.error}
        isLoading={isRefreshing}
        onSubmitKey={(key) => loadTelemetry(key)}
      />
    );
  }

  // Error state (e.g. 503 or server offline)
  if (fetchResult.status === "error") {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-4">
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 space-y-3">
          <div className="flex items-center gap-2.5 font-bold text-sm">
            <ShieldAlert className="size-5 text-rose-600 dark:text-rose-400" />
            <span>Observability Service Unavailable {fetchResult.statusCode ? `(${fetchResult.statusCode})` : ""}</span>
          </div>
          <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
            {fetchResult.error}
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => loadTelemetry()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 transition cursor-pointer"
              type="button"
            >
              <RefreshCw className="size-3.5" />
              <span>Retry Connection</span>
            </button>
            <button
              onClick={handleLockDashboard}
              className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/40 transition cursor-pointer"
              type="button"
            >
              Change Admin Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { data, percentiles, auditFeed } = fetchResult;

  // Render percentile metric helper with strict "collecting" state
  const renderPercentile = (metric: number | "collecting", label: string) => {
    if (metric === "collecting") {
      return (
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
            {label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Clock className="size-3" />
            <span>Collecting…</span>
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </span>
        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
          {metric} ms
        </span>
      </div>
    );
  };

  const endpointList: Array<{
    key: keyof MonitoredEndpoints;
    name: string;
    path: string;
    icon: typeof Server;
    telemetry: EndpointTelemetry & { configured?: boolean; configStatus?: string };
    pct: PercentileMetrics;
  }> = [
    {
      key: "workspaceTasks",
      name: "Workspace Tasks Store",
      path: data.endpoints.workspaceTasks.path,
      icon: Server,
      telemetry: data.endpoints.workspaceTasks,
      pct: percentiles.workspaceTasks
    },
    {
      key: "workspaceMembers",
      name: "Workspace Members Registry",
      path: data.endpoints.workspaceMembers.path,
      icon: Users,
      telemetry: data.endpoints.workspaceMembers,
      pct: percentiles.workspaceMembers
    },
    {
      key: "workspaceChat",
      name: "Workspace Chat & Activity",
      path: data.endpoints.workspaceChat.path,
      icon: MessageSquare,
      telemetry: data.endpoints.workspaceChat,
      pct: percentiles.workspaceChat
    },
    {
      key: "emailConfig",
      name: "SMTP Email Dispatch Service",
      path: data.endpoints.emailConfig.path,
      icon: Mail,
      telemetry: data.endpoints.emailConfig as EndpointTelemetry & { configured?: boolean; configStatus?: string },
      pct: percentiles.emailConfig
    }
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      {/* Top Header & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#20314a] dark:bg-[#121c2d] text-slate-900 dark:text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 font-bold">
              <Activity className="size-4.5" />
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              System Observability & Service Health
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real loopback latency probes • Sequential probe mode • Zero synthetic data
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-[#20314a] dark:bg-[#152336] dark:text-slate-300">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium">Live polling (15s)</span>
          </div>

          <button
            onClick={() => loadTelemetry()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#293d5c] dark:bg-[#172438] dark:text-slate-200 dark:hover:bg-[#1f304a] transition cursor-pointer disabled:opacity-50"
            type="button"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleResetSamples}
            title="Reset rolling latency sample buffers to collecting state"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#293d5c] dark:bg-[#172438] dark:text-slate-200 dark:hover:bg-[#1f304a] transition cursor-pointer"
            type="button"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset Samples</span>
          </button>

          <button
            onClick={handleLockDashboard}
            title="Lock telemetry & clear session key"
            className="flex size-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-[#20314a] dark:hover:bg-[#152336] dark:hover:text-slate-200 transition cursor-pointer"
            type="button"
          >
            <Lock className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Main 4 Endpoints Service Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {endpointList.map((ep) => {
          const Icon = ep.icon;
          const isEmail = ep.key === "emailConfig";
          const isOk = ep.telemetry.ok;
          const isConfigured = ep.telemetry.configured ?? true;

          // Distinct status badge evaluation
          let statusBadge: ReactElement;
          if (!isOk) {
            // Down state
            statusBadge = (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
                <AlertTriangle className="size-3" />
                <span>Down / Unreachable</span>
              </span>
            );
          } else if (isEmail && !isConfigured) {
            // Distinct "not configured" state for emailConfig (distinct from down)
            statusBadge = (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400">
                <AlertTriangle className="size-3" />
                <span>Not Configured</span>
              </span>
            );
          } else {
            // Operational state
            statusBadge = (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="size-3" />
                <span>Operational (HTTP {ep.telemetry.status})</span>
              </span>
            );
          }

          return (
            <div
              key={ep.key}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#20314a] dark:bg-[#121c2d] text-slate-900 dark:text-white space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-[#1a2940] dark:text-slate-300 border border-slate-200 dark:border-[#253957] shrink-0 font-bold">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {ep.name}
                    </h3>
                    <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate block">
                      {ep.path}
                    </code>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {isEmail && (
                    <button
                      onClick={() => setSmtpModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#2b3e5e] dark:bg-[#152336] dark:text-slate-300 transition-colors cursor-pointer"
                      title="Open SMTP Settings Modal"
                      type="button"
                    >
                      <Sliders className="size-2.5" />
                      <span>Configure</span>
                    </button>
                  )}
                  {statusBadge}
                </div>
              </div>

              {/* Exact user label: "Server-side probe latency (loopback)" */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-[#1a2940] dark:bg-[#152336] space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Server-side probe latency (loopback)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                    {ep.telemetry.latencyMs.toFixed(2)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">ms</span>
                </div>
              </div>

              {/* Percentiles from service.ts with collecting indicator */}
              <div className="border-t border-slate-100 pt-3 dark:border-[#1a2940] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">Rolling Percentiles</span>
                  <span className="font-mono text-[10px]">
                    {ep.pct.sampleCount} / 5+ samples
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-white p-2.5 dark:border-[#20314a] dark:bg-[#111b2b]">
                  {renderPercentile(ep.pct.p50, "p50")}
                  {renderPercentile(ep.pct.p95, "p95")}
                  {renderPercentile(ep.pct.p99, "p99")}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ephemeral Container Instance & Active Cache Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Serverless Instance Telemetry */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#20314a] dark:bg-[#121c2d] text-slate-900 dark:text-white space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-[#1a2940]">
            <Cpu className="size-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {data.thisServerlessInstance.scope}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {data.thisServerlessInstance.note}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-[#1a2940] dark:bg-[#152336]">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Uptime</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {data.thisServerlessInstance.uptimeSeconds}s
              </span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-[#1a2940] dark:bg-[#152336]">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">RSS Memory</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {data.thisServerlessInstance.memoryRssMB} MB
              </span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-[#1a2940] dark:bg-[#152336]">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Heap Used</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {data.thisServerlessInstance.memoryHeapUsedMB} MB
              </span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-[#1a2940] dark:bg-[#152336]">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Node & Region</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                {data.thisServerlessInstance.nodeVersion} • {data.thisServerlessInstance.region}
              </span>
            </div>
          </div>
        </div>

        {/* In-Memory Cache Buffers */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#20314a] dark:bg-[#121c2d] text-slate-900 dark:text-white space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-[#1a2940]">
            <Database className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Active Server In-Memory Cache
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-[#1a2940] dark:bg-[#152336]">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cached Workspaces</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                {data.activeServerCache.cachedWorkspacesCount}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-[#1a2940] dark:bg-[#152336]">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cached Task Buffers</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                {data.activeServerCache.cachedTaskBuffersCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* System Audit Feed Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#20314a] dark:bg-[#121c2d] text-slate-900 dark:text-white space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#1a2940]">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              System Audit Feed
            </span>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-[#20314a] dark:bg-[#152336] dark:text-slate-400">
            {auditFeed.available ? "Stream Active" : "Audit Log Disabled"}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-[#1a2940] dark:bg-[#111c2e]">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
            {auditFeed.message}
          </p>
          <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">
            Workspace events operate in-memory across active sessions without an external persistent audit log stream.
          </span>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
        <span>Probe Mode: {(data as { probeMode?: string }).probeMode || "sequential loopback"}</span>
        {lastRefreshedAt && (
          <span>Last probed: {lastRefreshedAt.toLocaleTimeString()}</span>
        )}
      </div>

      <SmtpSettingsModal
        isOpen={smtpModalOpen}
        onClose={() => setSmtpModalOpen(false)}
        onConfigSaved={() => loadTelemetry()}
      />
    </div>
  );
};
