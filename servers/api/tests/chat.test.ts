import { createServer, type Server } from "node:http";
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { WebSocket } from "ws";
import type { Logger } from "@workspace/logging";
import { createWebSocketService, type ChatMessage } from "../integrations/websocket/index.js";

const noopLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

const setupTestWsServer = async () => {
  const app = express();
  const server: Server = createServer(app);
  const wsService = createWebSocketService({ server, logger: noopLogger });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const wsUrl = `ws://127.0.0.1:${String(address.port)}/ws`;

  const cleanup = async () => {
    await wsService.close();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  };

  return { wsUrl, wsService, cleanup };
};

const createConnectedChatUser = async (
  wsUrl: string,
  workspaceId: string,
  user: { name: string; email: string }
): Promise<{
  ws: WebSocket;
  messages: Array<Record<string, unknown>>;
  waitForMessage: (predicate: (msg: Record<string, unknown>) => boolean, timeoutMs?: number) => Promise<Record<string, unknown>>;
  close: () => Promise<void>;
}> => {
  const ws = new WebSocket(wsUrl);
  const messages: Array<Record<string, unknown>> = [];

  ws.on("message", (raw) => {
    try {
      const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      messages.push(parsed);
    } catch {
      // Ignore non-json messages
    }
  });

  await new Promise<void>((resolve, reject) => {
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "join", workspaceId, user }));
      ws.send(JSON.stringify({ type: "ping" }));
    });

    const onInitialMessage = (raw: unknown) => {
      try {
        const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
        const parsed = JSON.parse(text) as Record<string, unknown>;
        if (parsed.type === "pong") {
          ws.off("message", onInitialMessage);
          resolve();
        }
      } catch {
        // ignore
      }
    };

    ws.on("message", onInitialMessage);
    ws.on("error", reject);
  });

  const waitForMessage = async (
    predicate: (msg: Record<string, unknown>) => boolean,
    timeoutMs = 3000
  ): Promise<Record<string, unknown>> => {
    const existing = messages.find(predicate);
    if (existing) return existing;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.off("message", handler);
        reject(new Error(`Timeout after ${String(timeoutMs)}ms waiting for chat message`));
      }, timeoutMs);

      const handler = (raw: unknown) => {
        try {
          const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
          const parsed = JSON.parse(text) as Record<string, unknown>;
          if (predicate(parsed)) {
            clearTimeout(timer);
            ws.off("message", handler);
            resolve(parsed);
          }
        } catch {
          // ignore
        }
      };

      ws.on("message", handler);
    });
  };

  const close = async () => {
    return new Promise<void>((resolve) => {
      if (ws.readyState === WebSocket.CLOSED) {
        resolve();
      } else {
        ws.once("close", () => { resolve(); });
        ws.close();
      }
    });
  };

  return { ws, messages, waitForMessage, close };
};

void test("Workspace Chat: Real-time text messaging between team lead and members", async () => {
  const { wsUrl, cleanup } = await setupTestWsServer();

  try {
    const lead = await createConnectedChatUser(wsUrl, "ws-alpha", { name: "Team Lead Sarah", email: "sarah@acme.com" });
    const dev = await createConnectedChatUser(wsUrl, "ws-alpha", { name: "Alex Developer", email: "alex@acme.com" });

    // Send a message from Dev
    const devMsg: ChatMessage = {
      id: "msg-101",
      workspaceId: "ws-alpha",
      senderName: "Alex Developer",
      senderEmail: "alex@acme.com",
      senderRole: "Developer",
      content: "Hey Team Lead Sarah, Sprint board updated!",
      timestamp: Date.now()
    };

    dev.ws.send(JSON.stringify({
      type: "chat_message",
      workspaceId: "ws-alpha",
      message: devMsg
    }));

    // Lead should receive it
    const broadcastToLead = await lead.waitForMessage(
      (m) => m.type === "chat_broadcast" && typeof m.message === "object" && m.message !== null && (m.message as Record<string, unknown>).id === "msg-101"
    );
    assert.equal(broadcastToLead.workspaceId, "ws-alpha");
    const receivedMsg = broadcastToLead.message as Record<string, unknown>;
    assert.equal(receivedMsg.content, "Hey Team Lead Sarah, Sprint board updated!");
    assert.equal(receivedMsg.senderName, "Alex Developer");
    assert.equal(receivedMsg.senderRole, "Developer");

    await lead.close();
    await dev.close();
  } finally {
    await cleanup();
  }
});

void test("Workspace Chat: File, Image, and Video attachments sharing", async () => {
  const { wsUrl, cleanup } = await setupTestWsServer();

  try {
    const lead = await createConnectedChatUser(wsUrl, "ws-media", { name: "Lead", email: "lead@media.com" });
    const designer = await createConnectedChatUser(wsUrl, "ws-media", { name: "Designer Mike", email: "mike@media.com" });

    // 1. Image attachment
    const imageMsg: ChatMessage = {
      id: "img-msg-1",
      workspaceId: "ws-media",
      senderName: "Designer Mike",
      senderEmail: "mike@media.com",
      senderRole: "Designer",
      content: "Check out the new design mockup:",
      attachment: {
        id: "att-img-1",
        name: "mockup.png",
        type: "image",
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        size: 1024,
        mimeType: "image/png"
      },
      timestamp: Date.now()
    };

    designer.ws.send(JSON.stringify({
      type: "chat_message",
      workspaceId: "ws-media",
      message: imageMsg
    }));

    const receivedImgBroadcast = await lead.waitForMessage(
      (m) => m.type === "chat_broadcast" && typeof m.message === "object" && m.message !== null && (m.message as Record<string, unknown>).id === "img-msg-1"
    );
    const recImg = (receivedImgBroadcast.message as Record<string, unknown>).attachment as Record<string, unknown>;
    assert.equal(recImg.type, "image");
    assert.equal(recImg.name, "mockup.png");
    assert.ok(typeof recImg.url === "string" && recImg.url.startsWith("data:image/png"));

    // 2. Video attachment
    const videoMsg: ChatMessage = {
      id: "vid-msg-1",
      workspaceId: "ws-media",
      senderName: "Designer Mike",
      senderEmail: "mike@media.com",
      senderRole: "Designer",
      content: "Here is the animation demo video:",
      attachment: {
        id: "att-vid-1",
        name: "demo.mp4",
        type: "video",
        url: "data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAA",
        size: 409600,
        mimeType: "video/mp4"
      },
      timestamp: Date.now()
    };

    designer.ws.send(JSON.stringify({
      type: "chat_message",
      workspaceId: "ws-media",
      message: videoMsg
    }));

    const receivedVidBroadcast = await lead.waitForMessage(
      (m) => m.type === "chat_broadcast" && typeof m.message === "object" && m.message !== null && (m.message as Record<string, unknown>).id === "vid-msg-1"
    );
    const recVid = (receivedVidBroadcast.message as Record<string, unknown>).attachment as Record<string, unknown>;
    assert.equal(recVid.type, "video");
    assert.equal(recVid.name, "demo.mp4");

    // 3. Document/File attachment
    const fileMsg: ChatMessage = {
      id: "file-msg-1",
      workspaceId: "ws-media",
      senderName: "Lead",
      senderEmail: "lead@media.com",
      senderRole: "Owner",
      content: "Approved! Here are the architecture specs PDF:",
      attachment: {
        id: "att-file-1",
        name: "architecture_specs.pdf",
        type: "file",
        url: "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoK",
        size: 2048,
        mimeType: "application/pdf"
      },
      timestamp: Date.now()
    };

    lead.ws.send(JSON.stringify({
      type: "chat_message",
      workspaceId: "ws-media",
      message: fileMsg
    }));

    const receivedDocBroadcast = await designer.waitForMessage(
      (m) => m.type === "chat_broadcast" && typeof m.message === "object" && m.message !== null && (m.message as Record<string, unknown>).id === "file-msg-1"
    );
    const recDoc = (receivedDocBroadcast.message as Record<string, unknown>).attachment as Record<string, unknown>;
    assert.equal(recDoc.type, "file");
    assert.equal(recDoc.name, "architecture_specs.pdf");

    await lead.close();
    await designer.close();
  } finally {
    await cleanup();
  }
});

void test("Workspace Chat: Room isolation and typing indicators", async () => {
  const { wsUrl, cleanup } = await setupTestWsServer();

  try {
    const ws1User = await createConnectedChatUser(wsUrl, "room-1", { name: "User 1", email: "u1@room1.com" });
    const ws2User = await createConnectedChatUser(wsUrl, "room-2", { name: "User 2", email: "u2@room2.com" });

    // User 1 sends typing indicator in room-1
    ws1User.ws.send(JSON.stringify({
      type: "chat_typing",
      workspaceId: "room-1",
      isTyping: true
    }));

    // User 1 sends message in room-1
    ws1User.ws.send(JSON.stringify({
      type: "chat_message",
      workspaceId: "room-1",
      message: {
        id: "room-1-msg",
        workspaceId: "room-1",
        senderName: "User 1",
        senderEmail: "u1@room1.com",
        content: "Private room 1 message",
        timestamp: Date.now()
      }
    }));

    // Wait a brief window to confirm User 2 in room-2 does NOT receive room-1 message
    await new Promise((r) => setTimeout(r, 150));

    const leakedMessage = ws2User.messages.find(
      (m) => m.type === "chat_broadcast" && typeof m.message === "object" && m.message !== null && (m.message as Record<string, unknown>).content === "Private room 1 message"
    );
    assert.equal(leakedMessage, undefined, "Room-2 user must NOT receive messages from room-1");

    // Dave joins room-1 and receives cached messages via chat_init
    const dave = await createConnectedChatUser(wsUrl, "room-1", { name: "Dave", email: "dave@room1.com" });
    const initMsg = await dave.waitForMessage((m) => m.type === "chat_init");
    assert.equal(initMsg.workspaceId, "room-1");
    const cachedList = initMsg.messages as Array<Record<string, unknown>>;
    assert.ok(Array.isArray(cachedList) && cachedList.length >= 1);
    assert.equal(cachedList[0]?.content, "Private room 1 message");

    await ws1User.close();
    await ws2User.close();
    await dave.close();
  } finally {
    await cleanup();
  }
});
