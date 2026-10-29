"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Task } from "@workspace/types";
import {
  saveWorkspaceTasks,
  normalizeTaskDates,
  getAllWorkspaces,
  saveActiveWorkspace,
  mergeWorkspaceMembers,
  type WorkspaceMember,
  type Workspace
} from "../storage/workspace-storage";
import type { UserSession } from "../storage/auth-storage";

type SocketOptions = {
  workspaceId: string;
  currentUser: UserSession | null;
  apiBaseUrl?: string;
  onTasksUpdated?: (tasks: readonly Task[], sender?: string) => void;
  onMembersUpdated?: (members: readonly WorkspaceMember[], sender?: string) => void;
};

export const useWorkspaceSocket = ({
  workspaceId,
  currentUser,
  apiBaseUrl,
  onTasksUpdated,
  onMembersUpdated
}: SocketOptions) => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollMembersIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastKnownVersionRef = useRef<number>(0);
  const myLastSentTimestampRef = useRef<number>(0);

  // Keep callbacks and user in refs so changes don't tear down WebSocket/channels
  const onTasksUpdatedRef = useRef(onTasksUpdated);
  useEffect(() => {
    onTasksUpdatedRef.current = onTasksUpdated;
  }, [onTasksUpdated]);

  const onMembersUpdatedRef = useRef(onMembersUpdated);
  useEffect(() => {
    onMembersUpdatedRef.current = onMembersUpdated;
  }, [onMembersUpdated]);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const getWsUrl = useCallback(() => {
    if (typeof window === "undefined") return null;
    const isHttps = window.location.protocol === "https:";
    const host = window.location.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    const base = apiBaseUrl && apiBaseUrl.trim() ? apiBaseUrl : "";

    // Vercel serverless platform does not host WebSockets.
    // Also if base points to the current frontend host, do not connect WS.
    if (base.includes("vercel.app") || (base && host && base.includes(host))) {
      return null;
    }

    // If running in production (e.g. Vercel) or on HTTPS, require valid secure wss to a dedicated backend
    if (isHttps || !isLocalhost) {
      if (base.startsWith("https://")) {
        return base.replace(/^https:\/\//, "wss://").replace(/\/+$/, "") + "/ws";
      }
      return null;
    }

    if (base) {
      return base.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://").replace(/\/+$/, "") + "/ws";
    }
    return `ws://${host}:4000/ws`;
  }, [apiBaseUrl]);

  // Update room user info if currentUser changes without disconnecting
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && currentUser && workspaceId) {
      try {
        socketRef.current.send(
          JSON.stringify({
            type: "join",
            workspaceId,
            user: { name: currentUser.name, email: currentUser.email, role: currentUser.role }
          })
        );
      } catch {}
    }
  }, [currentUser, workspaceId]);

  // Broadcast tasks to BroadcastChannel, WebSocket, and Next.js server route
  const broadcastTasks = useCallback(
    (tasks: readonly Task[], action: string = "sync", task?: Task) => {
      if (!workspaceId) return;
      const now = Date.now();
      myLastSentTimestampRef.current = now;
      const user = currentUserRef.current;
      const senderName = user?.name || user?.email || "Teammate";

      // 1. BroadcastChannel: Instant (0ms) sync across tabs/windows on the same machine
      if (channelRef.current) {
        try {
          channelRef.current.postMessage({
            type: "tasks_update",
            workspaceId,
            tasks,
            action,
            task,
            sender: senderName,
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
              user: user
                ? { name: user.name, email: user.email, role: user.role }
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
          sender: senderName,
          action
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
    [workspaceId]
  );

  // Broadcast members to BroadcastChannel, WebSocket, and Next.js server route
  const broadcastMembers = useCallback(
    (members: readonly WorkspaceMember[]) => {
      if (!workspaceId) return;
      const user = currentUserRef.current;
      const senderName = user?.name || user?.email || "Team Lead";

      if (channelRef.current) {
        try {
          channelRef.current.postMessage({
            type: "members_updated",
            workspaceId,
            members,
            sender: senderName,
            timestamp: Date.now()
          });
        } catch {}
      }

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(
            JSON.stringify({
              type: "members_update",
              workspaceId,
              members,
              user: user ? { name: user.name, email: user.email, role: user.role } : undefined
            })
          );
        } catch {}
      }

      void fetch("/api/workspace-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          members,
          sender: senderName
        })
      }).catch(() => {});
    },
    [workspaceId]
  );

  useEffect(() => {
    if (!workspaceId || typeof window === "undefined") return;

    let isSubscribed = true;

    // Helper to safely apply remote members to local storage & trigger UI refresh
    const applyRemoteMembers = (incoming: readonly WorkspaceMember[], senderName?: string) => {
      if (!Array.isArray(incoming) || incoming.length === 0) return;
      const all = getAllWorkspaces();
      const target = all.find((w) => w.id === workspaceId);
      if (!target) return;
      const merged = mergeWorkspaceMembers(target.members || [], incoming);
      const isChanged = merged.length !== (target.members || []).length ||
        merged.some((m, idx) => target.members[idx]?.email?.toLowerCase() !== m.email.toLowerCase());

      if (isChanged) {
        const updated: Workspace = { ...target, members: merged };
        saveActiveWorkspace(updated);
        window.dispatchEvent(new CustomEvent("projexa_workspace_members_change", { detail: { workspaceId, members: merged } }));
        window.dispatchEvent(new Event("projexa_session_change"));
        onMembersUpdatedRef.current?.(merged, senderName || "Sync");
      }
    };

    // A. Setup BroadcastChannel for 0ms cross-tab & incognito sync
    if ("BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel(`projexa_sync_${workspaceId}`);
        channelRef.current = channel;
        channel.onmessage = (event) => {
          if (!isSubscribed) return;
          const data = event.data;
          if (data && data.workspaceId === workspaceId) {
            if (Array.isArray(data.tasks)) {
              const myName = (currentUserRef.current?.name || currentUserRef.current?.email || "").toLowerCase();
              const sender = typeof data.sender === "string" ? data.sender : "";
              if (data.timestamp && Date.now() - data.timestamp < 100 && myName && sender.toLowerCase() === myName) {
                return;
              }
              const normalized = data.tasks.map(normalizeTaskDates);
              saveWorkspaceTasks(workspaceId, normalized);
              onTasksUpdatedRef.current?.(normalized, sender || "Live Sync");
            }
            if (Array.isArray(data.members)) {
              applyRemoteMembers(data.members, typeof data.sender === "string" ? data.sender : "Broadcast");
            }
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
          // Fall back gracefully while polling and BroadcastChannel keep syncing
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
            const user = currentUserRef.current;
            ws.send(
              JSON.stringify({
                type: "join",
                workspaceId,
                user: user
                  ? { name: user.name, email: user.email, role: user.role }
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
              if (data.workspaceId === workspaceId) {
                if (Array.isArray(data.tasks)) {
                  const normalized = data.tasks.map(normalizeTaskDates);
                  saveWorkspaceTasks(workspaceId, normalized);
                  onTasksUpdatedRef.current?.(normalized, data.sender || "WebSocket");
                }
                if (Array.isArray(data.members)) {
                  applyRemoteMembers(data.members, data.sender || "WebSocket");
                }
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
      setConnected(true);
    }

    // C. High-Frequency Cloud Polling (Tasks: 1s, Members: 2s) for live cross-device / multi-user sync
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
        const myName = (currentUserRef.current?.name || currentUserRef.current?.email || "").toLowerCase();
        const lastSender = typeof data.lastSender === "string" ? data.lastSender.toLowerCase() : "";
        const isSelf = Boolean(myName && lastSender && lastSender === myName);
        const isNotOurRecentSend = Date.now() - myLastSentTimestampRef.current > 800 || !isSelf;
        const isNewer = serverVersion > 0 && serverVersion > lastKnownVersionRef.current;

        if (isNewer && isNotOurRecentSend && data.tasks.length > 0) {
          lastKnownVersionRef.current = serverVersion;
          const normalized = data.tasks.map(normalizeTaskDates);
          saveWorkspaceTasks(workspaceId, normalized);
          onTasksUpdatedRef.current?.(normalized, data.lastSender || "Cloud Sync");
        } else if (lastKnownVersionRef.current === 0 && data.tasks.length > 0) {
          lastKnownVersionRef.current = serverVersion;
          const normalized = data.tasks.map(normalizeTaskDates);
          saveWorkspaceTasks(workspaceId, normalized);
          onTasksUpdatedRef.current?.(normalized, "Initial Sync");
        }
      } catch {}
    };

    const pollServerMembers = async () => {
      if (!isSubscribed) return;
      try {
        const res = await fetch(`/api/workspace-members?workspaceId=${encodeURIComponent(workspaceId)}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache" }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!isSubscribed || !data || !Array.isArray(data.members)) return;
        applyRemoteMembers(data.members, data.lastSender || "Cloud Sync");
      } catch {}
    };

    void pollServerTasks();
    void pollServerMembers();
    pollIntervalRef.current = setInterval(pollServerTasks, 1000);
    pollMembersIntervalRef.current = setInterval(pollServerMembers, 2000);

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollMembersIntervalRef.current) clearInterval(pollMembersIntervalRef.current);
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [workspaceId, getWsUrl]);

  return {
    connected,
    broadcastTasks,
    broadcastMembers
  };
};
