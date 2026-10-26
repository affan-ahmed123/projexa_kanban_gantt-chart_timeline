"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Task } from "@workspace/types";
import { saveWorkspaceTasks, normalizeTaskDates } from "../storage/workspace-storage";
import type { UserSession } from "../storage/auth-storage";

type SocketOptions = {
  workspaceId: string;
  currentUser: UserSession | null;
  apiBaseUrl?: string;
  onTasksUpdated?: (tasks: readonly Task[], sender?: string) => void;
};

export const useWorkspaceSocket = ({
  workspaceId,
  currentUser,
  apiBaseUrl,
  onTasksUpdated
}: SocketOptions) => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastKnownVersionRef = useRef<number>(0);
  const myLastSentTimestampRef = useRef<number>(0);

  const getWsUrl = useCallback(() => {
    if (typeof window === "undefined") return null;
    const isHttps = window.location.protocol === "https:";
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    const base = apiBaseUrl && apiBaseUrl.trim() ? apiBaseUrl : "";

    // If running in production (e.g. Vercel) or on HTTPS, do NOT attempt localhost ws
    if (isHttps || !isLocalhost) {
      if (base.startsWith("https://")) {
        return base.replace(/^https:\/\//, "wss://").replace(/\/+$/, "") + "/ws";
      }
      return null;
    }

    if (!base) {
      return "ws://localhost:4000/ws";
    }
    return base.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://").replace(/\/+$/, "") + "/ws";
  }, [apiBaseUrl]);

  // Broadcast tasks to BroadcastChannel, WebSocket, and Next.js server route
  const broadcastTasks = useCallback(
    (tasks: readonly Task[], action: string = "sync", task?: Task) => {
      if (!workspaceId) return;
      const now = Date.now();
      myLastSentTimestampRef.current = now;

      // 1. BroadcastChannel: Instant (0ms) sync across tabs/windows on the same machine
      if (channelRef.current) {
        try {
          channelRef.current.postMessage({
            type: "tasks_update",
            workspaceId,
            tasks,
            action,
            task,
            sender: currentUser?.name || currentUser?.email || "Teammate",
            timestamp: now
          });
        } catch {}
      }

      // 2. WebSocket: Send if open
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(
            JSON.stringify({
              type: "tasks_update",
              workspaceId,
              tasks,
              action,
              task,
              user: currentUser
                ? { name: currentUser.name, email: currentUser.email, role: currentUser.role }
                : undefined
            })
          );
        } catch {}
      }

      // 3. Next.js Server Route: Persist to shared cloud endpoint
      void fetch("/api/workspace-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          tasks,
          sender: currentUser?.name || currentUser?.email || "Teammate"
        })
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.version) {
            lastKnownVersionRef.current = data.version;
          }
        })
        .catch(() => {});
    },
    [workspaceId, currentUser]
  );

  useEffect(() => {
    if (!workspaceId || typeof window === "undefined") return;

    let isSubscribed = true;

    // A. Setup BroadcastChannel for 0ms cross-tab & incognito sync
    if ("BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel(`projexa_sync_${workspaceId}`);
        channelRef.current = channel;
        channel.onmessage = (event) => {
          if (!isSubscribed) return;
          const data = event.data;
          if (data && data.workspaceId === workspaceId && Array.isArray(data.tasks)) {
            // Ignore own echo if sent within last 300ms
            if (data.timestamp && Math.abs(Date.now() - data.timestamp) < 200 && data.sender === (currentUser?.name || currentUser?.email)) {
              return;
            }
            const normalized = data.tasks.map(normalizeTaskDates);
            saveWorkspaceTasks(workspaceId, normalized);
            onTasksUpdated?.(normalized, data.sender || "Live Sync");
          }
        };
      } catch {}
    }

    // B. Setup WebSocket if a valid URL exists
    const wsUrl = getWsUrl();
    if (wsUrl) {
      let retryCount = 0;
      const MAX_RETRIES = 2;

      const connectWs = () => {
        if (!isSubscribed) return;
        if (retryCount >= MAX_RETRIES) {
          // Local backend server is not listening on port 4000.
          // Stop reconnecting to prevent cluttering browser console with ERR_CONNECTION_REFUSED.
          // BroadcastChannel and Cloud Polling keep the board in live sync.
          setConnected(true);
          return;
        }

        try {
          const ws = new WebSocket(wsUrl);
          socketRef.current = ws;

          ws.onopen = () => {
            if (!isSubscribed) return;
            retryCount = 0;
            setConnected(true);
            ws.send(
              JSON.stringify({
                type: "join",
                workspaceId,
                user: currentUser
                  ? { name: currentUser.name, email: currentUser.email, role: currentUser.role }
                  : undefined
              })
            );

            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "ping" }));
              }
            }, 25000);
          };

          ws.onmessage = (event) => {
            if (!isSubscribed) return;
            try {
              const data = JSON.parse(event.data);
              if (data.workspaceId === workspaceId && Array.isArray(data.tasks)) {
                const normalized = data.tasks.map(normalizeTaskDates);
                saveWorkspaceTasks(workspaceId, normalized);
                onTasksUpdated?.(normalized, data.sender || "WebSocket");
              }
            } catch {}
          };

          ws.onclose = () => {
            if (!isSubscribed) return;
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            retryCount++;
            if (retryCount < MAX_RETRIES) {
              reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
            } else {
              setConnected(true);
            }
          };

          ws.onerror = () => {
            try { ws.close(); } catch {}
          };
        } catch {
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            reconnectTimeoutRef.current = setTimeout(connectWs, 4000);
          } else {
            setConnected(true);
          }
        }
      };

      connectWs();
    } else {
      // If WebSocket is not supported/configured (e.g. Vercel Serverless), mark live sync active
      setConnected(true);
    }

    // C. Setup High-Frequency Cloud Polling (Every 1.5s) for live cross-device sync
    const pollServerTasks = async () => {
      if (!isSubscribed) return;
      try {
        const res = await fetch(`/api/workspace-tasks?workspaceId=${encodeURIComponent(workspaceId)}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache" }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!isSubscribed || !data || !Array.isArray(data.tasks)) return;

        const serverVersion = typeof data.version === "number" ? data.version : 0;
        // Check if server version changed and wasn't our own immediate update
        const isNewer = serverVersion > 0 && serverVersion > lastKnownVersionRef.current;
        const isNotOurRecentSend = Date.now() - myLastSentTimestampRef.current > 1200;

        if (isNewer && isNotOurRecentSend && data.tasks.length > 0) {
          lastKnownVersionRef.current = serverVersion;
          const normalized = data.tasks.map(normalizeTaskDates);
          saveWorkspaceTasks(workspaceId, normalized);
          onTasksUpdated?.(normalized, data.lastSender || "Cloud Sync");
        } else if (lastKnownVersionRef.current === 0 && data.tasks.length > 0) {
          lastKnownVersionRef.current = serverVersion;
          const normalized = data.tasks.map(normalizeTaskDates);
          saveWorkspaceTasks(workspaceId, normalized);
          onTasksUpdated?.(normalized, "Initial Sync");
        }
      } catch {}
    };

    // Run immediate check then every 1.5 seconds
    void pollServerTasks();
    pollIntervalRef.current = setInterval(pollServerTasks, 1500);

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [workspaceId, getWsUrl, currentUser, onTasksUpdated]);

  return {
    connected,
    broadcastTasks
  };
};
