import test from "node:test";
import assert from "node:assert/strict";
import {
  loadLocalChatMessages,
  getLastReadTimestamp,
  type ChatMessage,
  type ChatAttachment
} from "../../features/workspace-chat/public";

test("workspace-chat storage returns empty arrays gracefully outside browser", () => {
  assert.deepEqual(loadLocalChatMessages("ws-test"), []);
  assert.equal(typeof getLastReadTimestamp("ws-test"), "number");
});

test("workspace-chat message models support text, image, video, and file attachments", () => {
  const imageAttachment: ChatAttachment = {
    id: "att-1",
    name: "screenshot.png",
    type: "image",
    url: "data:image/png;base64,abc",
    size: 512,
    mimeType: "image/png"
  };

  const videoAttachment: ChatAttachment = {
    id: "att-2",
    name: "demo.mp4",
    type: "video",
    url: "data:video/mp4;base64,xyz",
    size: 2048,
    mimeType: "video/mp4"
  };

  const fileAttachment: ChatAttachment = {
    id: "att-3",
    name: "specs.pdf",
    type: "file",
    url: "data:application/pdf;base64,123",
    size: 1024,
    mimeType: "application/pdf"
  };

  const msg1: ChatMessage = {
    id: "m-1",
    workspaceId: "ws-test",
    senderName: "Alice Lead",
    senderEmail: "alice@acme.com",
    senderRole: "Team Lead",
    content: "Welcome to team chat!",
    timestamp: Date.now()
  };

  const msg2: ChatMessage = {
    id: "m-2",
    workspaceId: "ws-test",
    senderName: "Bob Dev",
    senderEmail: "bob@acme.com",
    senderRole: "Developer",
    content: "Here is the screenshot:",
    attachment: imageAttachment,
    timestamp: Date.now() + 100
  };

  const msg3: ChatMessage = {
    id: "m-3",
    workspaceId: "ws-test",
    senderName: "Charlie QA",
    senderEmail: "charlie@acme.com",
    senderRole: "QA",
    content: "Here is the bug recording:",
    attachment: videoAttachment,
    timestamp: Date.now() + 200
  };

  const msg4: ChatMessage = {
    id: "m-4",
    workspaceId: "ws-test",
    senderName: "Dave PM",
    senderEmail: "dave@acme.com",
    senderRole: "Product Manager",
    content: "Attached the specs document:",
    attachment: fileAttachment,
    timestamp: Date.now() + 300
  };

  assert.equal(msg1.content, "Welcome to team chat!");
  assert.equal(msg2.attachment?.type, "image");
  assert.equal(msg3.attachment?.type, "video");
  assert.equal(msg4.attachment?.type, "file");
  assert.equal(msg4.attachment.name, "specs.pdf");
});
