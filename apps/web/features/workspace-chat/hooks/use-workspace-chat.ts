"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatAttachment, ChatMessage, TypingUser } from "../types";
import {
  getLastReadTimestamp,
  loadLocalChatMessages,
  saveLocalChatMessages,
  setLastReadTimestamp
} from "../storage/chat-storage";
import type { UserSession } from "@/features/workspace-foundation/public";

type UseWorkspaceChatOptions = {
  workspaceId: string;
  currentUser: UserSession | null;
  apiBaseUrl?: string | undefined;
  isChatOpen?: boolean | undefined;
};

export const useWorkspaceChat = ({
  workspaceId,
  currentUser,
  apiBaseUrl,
  isChatOpen = false
}: UseWorkspaceChatOptions) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const myTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadRef = useRef<number>(0);

  const getWsUrl = useCallback(() => {
    if (typeof window === "undefined") return null;
    const isHttps = window.location.protocol === "https:";
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const base = apiBaseUrl && apiBaseUrl.trim() ? apiBaseUrl : "";

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

  // Merge messages avoiding duplicates by message id
  const mergeIncomingMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const newItems = incoming.filter((m) => !existingIds.has(m.id));
      if (newItems.length === 0) return prev;
      const combined = [...prev, ...newItems].sort((a, b) => a.timestamp - b.timestamp);
      saveLocalChatMessages(workspaceId, combined);
      return combined;
    });
  }, [workspaceId]);

  // Mark all messages as read
  const markAsRead = useCallback(() => {
    const now = Date.now();
    lastReadRef.current = now;
    setLastReadTimestamp(workspaceId, now);
    setUnreadCount(0);
  }, [workspaceId]);

  // Calculate unread count whenever messages change or chat opens
  useEffect(() => {
    if (!workspaceId) return;
    if (isChatOpen) {
      markAsRead();
    } else {
      const lastRead = getLastReadTimestamp(workspaceId);
      lastReadRef.current = lastRead;
      const unread = messages.filter(
        (m) => m.timestamp > lastRead && m.senderEmail.toLowerCase() !== currentUser?.email.toLowerCase()
      ).length;
      setUnreadCount(unread);
    }
  }, [workspaceId, isChatOpen, messages, currentUser?.email, markAsRead]);

  // Load initial messages from localStorage and Next.js cloud endpoint
  const refreshMessages = useCallback(async () => {
    if (!workspaceId) return;
    const local = loadLocalChatMessages(workspaceId);
    if (local.length > 0) {
      setMessages(local);
      // Synchronize local messages to cloud endpoint so other workspace members receive them
      void fetch("/api/workspace-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, messages: local })
      }).catch(() => {});
    }

    try {
      const res = await fetch(`/api/workspace-chat?workspaceId=${encodeURIComponent(workspaceId)}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.messages)) {
          mergeIncomingMessages(data.messages as ChatMessage[]);
        }
      }
    } catch {
      // Cloud fallback network failure: ignore
    }
  }, [workspaceId, mergeIncomingMessages]);

  // WebSocket, BroadcastChannel & Cloud Polling setup
  useEffect(() => {
    if (!workspaceId || typeof window === "undefined") return;

    let isSubscribed = true;
    lastReadRef.current = getLastReadTimestamp(workspaceId);
    void refreshMessages();

    // 1. BroadcastChannel for 0ms cross-tab sync
    if ("BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel(`projexa_chat_${workspaceId}`);
        channelRef.current = channel;
        channel.onmessage = (event) => {
          if (!isSubscribed) return;
          const data = event.data;
          if (data && data.workspaceId === workspaceId) {
            if (data.type === "chat_message" && data.message) {
              mergeIncomingMessages([data.message as ChatMessage]);
            } else if (data.type === "chat_typing") {
              const name = String(data.user?.name ?? "");
              const email = String(data.user?.email ?? "");
              if (name && email !== currentUser?.email) {
                if (data.isTyping) {
                  setTypingUsers((prev) =>
                    prev.some((u) => u.email === email) ? prev : [...prev, { name, email }]
                  );
                } else {
                  setTypingUsers((prev) => prev.filter((u) => u.email !== email));
                }
              }
            }
          }
        };
      } catch {}
    }

    // 2. WebSocket
    const wsUrl = getWsUrl();
    if (wsUrl) {
      let retryCount = 0;
      const MAX_RETRIES = 3;

      const connectWs = () => {
        if (!isSubscribed) return;
        if (retryCount >= MAX_RETRIES) {
          setIsConnected(true);
          return;
        }

        try {
          const ws = new WebSocket(wsUrl);
          socketRef.current = ws;

          ws.onopen = () => {
            if (!isSubscribed) return;
            retryCount = 0;
            setIsConnected(true);
            ws.send(
              JSON.stringify({
                type: "join",
                workspaceId,
                user: currentUser
                  ? { name: currentUser.name, email: currentUser.email, role: currentUser.role }
                  : undefined
              })
            );
          };

          ws.onmessage = (event) => {
            if (!isSubscribed) return;
            try {
              const data = JSON.parse(event.data);
              if (data.workspaceId === workspaceId) {
                if (data.type === "chat_init" && Array.isArray(data.messages)) {
                  mergeIncomingMessages(data.messages as ChatMessage[]);
                } else if (data.type === "chat_broadcast" && data.message) {
                  mergeIncomingMessages([data.message as ChatMessage]);
                } else if (data.type === "chat_typing") {
                  const userObj = data.user as { name?: string; email?: string } | undefined;
                  const name = userObj?.name ?? "";
                  const email = userObj?.email ?? "";
                  if (name && email !== currentUser?.email) {
                    if (data.isTyping) {
                      setTypingUsers((prev) =>
                        prev.some((u) => u.email === email) ? prev : [...prev, { name, email }]
                      );
                      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                      typingTimerRef.current = setTimeout(() => {
                        setTypingUsers((prev) => prev.filter((u) => u.email !== email));
                      }, 3500);
                    } else {
                      setTypingUsers((prev) => prev.filter((u) => u.email !== email));
                    }
                  }
                }
              }
            } catch {}
          };

          ws.onclose = () => {
            if (!isSubscribed) return;
            retryCount++;
            if (retryCount < MAX_RETRIES) {
              reconnectTimerRef.current = setTimeout(connectWs, 3000);
            } else {
              setIsConnected(true);
            }
          };

          ws.onerror = () => {
            try { ws.close(); } catch {}
          };
        } catch {
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            reconnectTimerRef.current = setTimeout(connectWs, 3000);
          } else {
            setIsConnected(true);
          }
        }
      };

      connectWs();
    } else {
      setIsConnected(true);
    }

    // 3. High-Frequency Cloud Polling for live cross-device / multi-user sync on Vercel
    const pollServerChat = async () => {
      if (!isSubscribed) return;
      try {
        const res = await fetch(`/api/workspace-chat?workspaceId=${encodeURIComponent(workspaceId)}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!isSubscribed || !data) return;

        if (Array.isArray(data.messages) && data.messages.length > 0) {
          mergeIncomingMessages(data.messages as ChatMessage[]);
        }

        if (Array.isArray(data.typingUsers)) {
          const myEmail = currentUser?.email?.toLowerCase() ?? "";
          const othersTyping = (data.typingUsers as Array<{ name: string; email: string }>).filter(
            (u) => u.email.toLowerCase() !== myEmail
          );
          setTypingUsers(othersTyping);
        }
      } catch {}
    };

    void pollServerChat();
    const pollInterval = setInterval(pollServerChat, isChatOpen ? 1500 : 3000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [workspaceId, getWsUrl, currentUser, isChatOpen, refreshMessages, mergeIncomingMessages]);

  // Send typing signal to peers
  const emitTypingPayload = useCallback(
    (isTyping: boolean) => {
      if (!workspaceId) return;

      const payload = {
        type: "chat_typing",
        workspaceId,
        user: currentUser ? { name: currentUser.name, email: currentUser.email } : { name: "Teammate", email: "" },
        isTyping
      };

      // BroadcastChannel
      if (channelRef.current) {
        try { channelRef.current.postMessage(payload); } catch {}
      }

      // WebSocket
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try { socketRef.current.send(JSON.stringify(payload)); } catch {}
      }

      // Next.js server route for cross-device typing
      void fetch("/api/workspace-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          typingUser: currentUser
            ? { name: currentUser.name, email: currentUser.email, isTyping }
            : { name: "Teammate", email: "teammate@example.com", isTyping }
        })
      }).catch(() => {});
    },
    [workspaceId, currentUser]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      emitTypingPayload(isTyping);

      if (isTyping) {
        if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
        myTypingTimeoutRef.current = setTimeout(() => {
          emitTypingPayload(false);
        }, 3000);
      }
    },
    [emitTypingPayload]
  );

  // Send a chat message with optional file/image/video attachment
  const sendMessage = useCallback(
    async ({
      content,
      file
    }: {
      content: string;
      file?: File | null;
    }): Promise<boolean> => {
      if (!workspaceId) return false;
      const text = content.trim();
      if (!text && !file) return false;

      let attachment: ChatAttachment | undefined = undefined;

      if (file) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
          });

          let type: ChatAttachment["type"] = "file";
          if (file.type.startsWith("image/")) {
            type = "image";
          } else if (file.type.startsWith("video/")) {
            type = "video";
          }

          attachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            type,
            url: dataUrl,
            size: file.size,
            mimeType: file.type
          };
        } catch {
          return false;
        }
      }

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        workspaceId,
        senderName: currentUser?.name || "Team Member",
        senderEmail: currentUser?.email || "member@example.com",
        senderRole: currentUser?.role || "Developer",
        senderGender: currentUser?.gender || "neutral",
        content: text,
        attachment,
        timestamp: Date.now()
      };

      // 1. Optimistic local update
      mergeIncomingMessages([newMsg]);

      // 2. BroadcastChannel (0ms sync to other tabs)
      if (channelRef.current) {
        try {
          channelRef.current.postMessage({
            type: "chat_message",
            workspaceId,
            message: newMsg
          });
        } catch {}
      }

      // 3. WebSocket send
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(
            JSON.stringify({
              type: "chat_message",
              workspaceId,
              message: newMsg
            })
          );
        } catch {}
      }

      // 4. Next.js server route persistence
      void fetch("/api/workspace-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, message: newMsg })
      }).catch(() => {});

      // Clear typing indicator
      sendTyping(false);

      return true;
    },
    [workspaceId, currentUser, mergeIncomingMessages, sendTyping]
  );

  return {
    messages,
    typingUsers,
    isConnected,
    unreadCount,
    sendMessage,
    sendTyping,
    markAsRead,
    refreshMessages
  };
};
