import test from "node:test";
import assert from "node:assert/strict";
import { createInvitationUrl } from "../../features/workspace-foundation/models/invitation";
import type { Workspace, WorkspaceMember } from "../../features/workspace-foundation/models/workspace-storage";

test("createInvitationUrl returns empty string in non-browser environment", () => {
  const dummyWs: Workspace = {
    id: "ws-123",
    name: "Engineering Squad",
    slug: "engineering-squad",
    icon: "rocket",
    department: "Engineering",
    creatorEmail: "lead@example.com",
    teamLead: { name: "Lead", email: "lead@example.com" },
    members: [],
    createdAt: new Date().toISOString()
  };
  const dummyMember: WorkspaceMember = {
    id: "mem-1",
    name: "Affan",
    email: "affan@example.com",
    role: "Developer"
  };

  const url = createInvitationUrl(dummyWs, dummyMember);
  assert.equal(url, "");
});
