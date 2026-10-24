import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { Logger } from "@workspace/logging";
import type { Task } from "@workspace/types";

export type WebSocketService = Readonly<{
  getWorkspaceTasks: (workspaceId: string) => readonly Task[] | null;
  setWorkspaceTasks: (workspaceId: string, tasks: readonly Task[]) => void;
  broadcastTasksUpdated: (workspaceId: string, tasks: readonly Task[], sender?: string) => void;
  close: () => Promise<void>;
}>;

type WebSocketServiceDependencies = Readonly<{
  server: Server;
  logger: Logger;
}>;

type ClientInfo = {
  workspaceId: string | null;
  userName: string | null;
  userEmail: string | null;
};

export const createWebSocketService = ({
  server,
  logger
}: WebSocketServiceDependencies): WebSocketService => {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const workspaceClients = new Map<string, Set<WebSocket>>();
  const workspaceTasksCache = new Map<string, readonly Task[]>();
  const clientMeta = new Map<WebSocket, ClientInfo>();

  wss.on("connection", (socket: WebSocket) => {
    clientMeta.set(socket, { workspaceId: null, userName: null, userEmail: null });
    logger.info("WebSocket client connected.");

    socket.on("message", (raw: unknown) => {
      try {
        const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
        const data = JSON.parse(text) as Record<string, unknown>;
        const type = String(data.type ?? "");
        const meta = clientMeta.get(socket);

        if (type === "join") {
          const workspaceId = typeof data.workspaceId === "string" ? data.workspaceId : "";
          if (!workspaceId) return;

          // Remove from previous room if any
          if (meta?.workspaceId && workspaceClients.has(meta.workspaceId)) {
            workspaceClients.get(meta.workspaceId)?.delete(socket);
          }

          if (meta) {
            meta.workspaceId = workspaceId;
            const user = data.user as Record<string, unknown> | undefined;
            meta.userName = typeof user?.name === "string" ? user.name : null;
            meta.userEmail = typeof user?.email === "string" ? user.email : null;
          }

          if (!workspaceClients.has(workspaceId)) {
            workspaceClients.set(workspaceId, new Set());
          }
          workspaceClients.get(workspaceId)!.add(socket);
          logger.info("WebSocket joined workspace room.", { workspaceId, user: meta?.userName });

          // Send cached tasks immediately if available
          const cached = workspaceTasksCache.get(workspaceId);
          if (cached && cached.length > 0) {
            socket.send(JSON.stringify({
              type: "tasks_init",
              workspaceId,
              tasks: cached
            }));
          }
        } else if (type === "sync_tasks" || type === "tasks_update") {
          const workspaceId = typeof data.workspaceId === "string" ? data.workspaceId : meta?.workspaceId;
          const tasks = Array.isArray(data.tasks) ? (data.tasks as Task[]) : null;
          if (workspaceId && tasks) {
            workspaceTasksCache.set(workspaceId, tasks);
            const clients = workspaceClients.get(workspaceId);
            if (clients) {
              const payload = JSON.stringify({
                type: "tasks_updated",
                workspaceId,
                tasks,
                sender: meta?.userName || "Team Lead",
                action: typeof data.action === "string" ? data.action : "sync"
              });
              for (const client of clients) {
                if (client !== socket && client.readyState === WebSocket.OPEN) {
                  client.send(payload);
                }
              }
            }
          }
        } else if (type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
        }
      } catch (error) {
        logger.error("Failed to process WebSocket message.", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    socket.on("close", () => {
      const meta = clientMeta.get(socket);
      if (meta?.workspaceId && workspaceClients.has(meta.workspaceId)) {
        const room = workspaceClients.get(meta.workspaceId);
        room?.delete(socket);
        if (room && room.size === 0) {
          workspaceClients.delete(meta.workspaceId);
        }
      }
      clientMeta.delete(socket);
      logger.info("WebSocket client disconnected.");
    });

    socket.on("error", (error) => {
      logger.error("WebSocket socket error.", { error: error.message });
    });
  });

  return Object.freeze({
    getWorkspaceTasks: (workspaceId: string) => workspaceTasksCache.get(workspaceId) ?? null,
    setWorkspaceTasks: (workspaceId: string, tasks: readonly Task[]) => {
      workspaceTasksCache.set(workspaceId, tasks);
      const clients = workspaceClients.get(workspaceId);
      if (clients) {
        const payload = JSON.stringify({
          type: "tasks_updated",
          workspaceId,
          tasks,
          sender: "System"
        });
        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        }
      }
    },
    broadcastTasksUpdated: (workspaceId: string, tasks: readonly Task[], sender?: string) => {
      workspaceTasksCache.set(workspaceId, tasks);
      const clients = workspaceClients.get(workspaceId);
      if (clients) {
        const payload = JSON.stringify({
          type: "tasks_updated",
          workspaceId,
          tasks,
          sender: sender || "Team Lead"
        });
        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        }
      }
    },
    close: async () => {
      for (const client of wss.clients) {
        try {
          client.close();
        } catch {}
      }
      return new Promise<void>((resolve) => {
        wss.close(() => resolve());
      });
    }
  });
};
