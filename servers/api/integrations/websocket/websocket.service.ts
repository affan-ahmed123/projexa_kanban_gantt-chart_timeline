import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { Logger } from "@workspace/logging";
import type { Task } from "@workspace/types";

export type ChatAttachment = Readonly<{
  id: string;
  name: string;
  type: "image" | "video" | "file";
  url: string;
  size: number;
  mimeType?: string;
}>;

export type ChatMessage = Readonly<{
  id: string;
  workspaceId: string;
  senderName: string;
  senderEmail: string;
  senderRole?: string;
  content: string;
  attachment?: ChatAttachment;
  timestamp: number;
}>;

export type WebSocketService = Readonly<{
  getWorkspaceTasks: (workspaceId: string) => readonly Task[] | null;
  setWorkspaceTasks: (workspaceId: string, tasks: readonly Task[]) => void;
  broadcastTasksUpdated: (workspaceId: string, tasks: readonly Task[], sender?: string) => void;
  getWorkspaceMessages: (workspaceId: string) => readonly ChatMessage[];
  addWorkspaceMessage: (workspaceId: string, message: ChatMessage) => void;
  broadcastChatMessage: (workspaceId: string, message: ChatMessage) => void;
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
  const workspaceMessagesCache = new Map<string, ChatMessage[]>();
  const clientMeta = new Map<WebSocket, ClientInfo>();

  wss.on("connection", (socket: WebSocket) => {
    clientMeta.set(socket, { workspaceId: null, userName: null, userEmail: null });
    logger.info("WebSocket client connected.");

    socket.on("message", (raw: unknown) => {
      try {
        const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
        const data = JSON.parse(text) as Record<string, unknown>;
        const type = typeof data.type === "string" ? data.type : "";
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

          let room = workspaceClients.get(workspaceId);
          if (!room) {
            room = new Set();
            workspaceClients.set(workspaceId, room);
          }
          room.add(socket);
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

          // Send cached chat messages immediately if available
          const cachedMessages = workspaceMessagesCache.get(workspaceId);
          if (cachedMessages && cachedMessages.length > 0) {
            socket.send(JSON.stringify({
              type: "chat_init",
              workspaceId,
              messages: cachedMessages
            }));
          }
        } else if (type === "sync_tasks" || type === "tasks_update") {
          const workspaceId = typeof data.workspaceId === "string" ? data.workspaceId : (meta?.workspaceId ?? "");
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
        } else if (type === "chat_message") {
          const workspaceId = typeof data.workspaceId === "string" ? data.workspaceId : (meta?.workspaceId ?? "");
          const msgObj = (data.message && typeof data.message === "object") ? (data.message as Record<string, unknown>) : null;
          if (workspaceId && msgObj) {
            const rawAtt = (msgObj.attachment && typeof msgObj.attachment === "object")
              ? (msgObj.attachment as Record<string, unknown>)
              : null;

            const attachment: ChatAttachment | undefined = rawAtt ? {
              id: typeof rawAtt.id === "string" ? rawAtt.id : `att-${String(Date.now())}`,
              name: typeof rawAtt.name === "string" ? rawAtt.name : "attachment",
              type: (rawAtt.type === "image" || rawAtt.type === "video") ? rawAtt.type : "file",
              url: typeof rawAtt.url === "string" ? rawAtt.url : "",
              size: typeof rawAtt.size === "number" ? rawAtt.size : 0,
              ...(typeof rawAtt.mimeType === "string" ? { mimeType: rawAtt.mimeType } : {})
            } : undefined;

            const chatMsg: ChatMessage = {
              id: typeof msgObj.id === "string" ? msgObj.id : `msg-${String(Date.now())}-${Math.random().toString(36).slice(2, 7)}`,
              workspaceId,
              senderName: typeof msgObj.senderName === "string" ? msgObj.senderName : (meta?.userName || "Team Member"),
              senderEmail: typeof msgObj.senderEmail === "string" ? msgObj.senderEmail : (meta?.userEmail || "member@example.com"),
              content: typeof msgObj.content === "string" ? msgObj.content : "",
              timestamp: typeof msgObj.timestamp === "number" ? msgObj.timestamp : Date.now(),
              ...(typeof msgObj.senderRole === "string" ? { senderRole: msgObj.senderRole } : {}),
              ...(attachment ? { attachment } : {})
            };

            let list = workspaceMessagesCache.get(workspaceId);
            if (!list) {
              list = [];
              workspaceMessagesCache.set(workspaceId, list);
            }
            list.push(chatMsg);
            if (list.length > 200) {
              list.shift();
            }

            const clients = workspaceClients.get(workspaceId);
            if (clients) {
              const payload = JSON.stringify({
                type: "chat_broadcast",
                workspaceId,
                message: chatMsg
              });
              for (const client of clients) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(payload);
                }
              }
            }
          }
        } else if (type === "chat_typing") {
          const workspaceId = typeof data.workspaceId === "string" ? data.workspaceId : (meta?.workspaceId ?? "");
          const isTyping = Boolean(data.isTyping);
          if (workspaceId) {
            const userObj = (data.user && typeof data.user === "object") ? (data.user as Record<string, unknown>) : null;
            const userName = typeof userObj?.name === "string" ? userObj.name : (meta?.userName || "Teammate");
            const userEmail = typeof userObj?.email === "string" ? userObj.email : (meta?.userEmail || "");

            const clients = workspaceClients.get(workspaceId);
            if (clients) {
              const payload = JSON.stringify({
                type: "chat_typing",
                workspaceId,
                user: { name: userName, email: userEmail },
                isTyping
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
    getWorkspaceMessages: (workspaceId: string) => workspaceMessagesCache.get(workspaceId) ?? [],
    addWorkspaceMessage: (workspaceId: string, message: ChatMessage) => {
      let list = workspaceMessagesCache.get(workspaceId);
      if (!list) {
        list = [];
        workspaceMessagesCache.set(workspaceId, list);
      }
      list.push(message);
      if (list.length > 200) {
        list.shift();
      }
    },
    broadcastChatMessage: (workspaceId: string, message: ChatMessage) => {
      let list = workspaceMessagesCache.get(workspaceId);
      if (!list) {
        list = [];
        workspaceMessagesCache.set(workspaceId, list);
      }
      list.push(message);
      if (list.length > 200) {
        list.shift();
      }

      const clients = workspaceClients.get(workspaceId);
      if (clients) {
        const payload = JSON.stringify({
          type: "chat_broadcast",
          workspaceId,
          message
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
        } catch {
          // Ignore close errors during shutdown
        }
      }
      return new Promise<void>((resolve) => {
        wss.close(() => {
          resolve();
        });
      });
    }
  });
};
