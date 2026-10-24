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

  const getWsUrl = useCallback(() => {
    const base = apiBaseUrl && apiBaseUrl.trim() ? apiBaseUrl : "http://localhost:4000";
    return base.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://").replace(/\/+$/, "") + "/ws";
  }, [apiBaseUrl]);

  // Broadcast tasks to server and all connected workspace peers
  const broadcastTasks = useCallback(
    (tasks: readonly Task[], action: string = "sync", task?: Task) => {
      if (!workspaceId) return;

      // 1. Send via WebSocket if connected
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
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
      }

      // 2. Fallback persist to Next.js server route
      void fetch("/api/workspace-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, tasks })
      }).catch(() => {});
    },
    [workspaceId, currentUser]
  );

  useEffect(() => {
    if (!workspaceId || typeof window === "undefined") return;

    let isSubscribed = true;

    const connect = () => {
      try {
        const url = getWsUrl();
        const ws = new WebSocket(url);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) return;
          setConnected(true);
          // Join the workspace channel
          ws.send(
            JSON.stringify({
              type: "join",
              workspaceId,
              user: currentUser
                ? { name: currentUser.name, email: currentUser.email, role: currentUser.role }
                : undefined
            })
          );

          // Setup ping interval
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
              onTasksUpdated?.(normalized, data.sender);
            }
          } catch {}
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          setConnected(false);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          // Auto reconnect after 2.5s
          reconnectTimeoutRef.current = setTimeout(connect, 2500);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setConnected(false);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    connect();

    // Also fetch initial tasks from Next.js server cache if local tasks are empty
    void fetch(`/api/workspace-tasks?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isSubscribed && data && Array.isArray(data.tasks) && data.tasks.length > 0) {
          const normalized = data.tasks.map(normalizeTaskDates);
          saveWorkspaceTasks(workspaceId, normalized);
          onTasksUpdated?.(normalized, "Server Sync");
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
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
