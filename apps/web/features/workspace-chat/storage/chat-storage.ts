import type { ChatMessage } from "../types";

const STORAGE_PREFIX = "projexa_chat_messages_";
const READ_PREFIX = "projexa_chat_read_";

export const loadLocalChatMessages = (workspaceId: string): ChatMessage[] => {
  if (typeof window === "undefined" || !workspaceId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${workspaceId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
};

export const saveLocalChatMessages = (workspaceId: string, messages: ChatMessage[]): void => {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    // Keep max 200 items in localStorage
    const truncated = messages.slice(-200);
    localStorage.setItem(`${STORAGE_PREFIX}${workspaceId}`, JSON.stringify(truncated));
  } catch {
    // Ignore storage quota exceeded or disabled storage
  }
};

export const saveLocalChatMessage = (workspaceId: string, message: ChatMessage): void => {
  if (typeof window === "undefined" || !workspaceId) return;
  const current = loadLocalChatMessages(workspaceId);
  if (!current.some((m) => m.id === message.id)) {
    saveLocalChatMessages(workspaceId, [...current, message]);
  }
};

export const getLastReadTimestamp = (workspaceId: string): number => {
  if (typeof window === "undefined" || !workspaceId) return Date.now();
  try {
    const val = localStorage.getItem(`${READ_PREFIX}${workspaceId}`);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
};

export const setLastReadTimestamp = (workspaceId: string, timestamp: number): void => {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    localStorage.setItem(`${READ_PREFIX}${workspaceId}`, String(timestamp));
  } catch {
    // Ignore storage issues
  }
};
