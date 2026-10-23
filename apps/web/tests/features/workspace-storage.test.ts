import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_WORKSPACE,
  DEFAULT_LEAD,
  getAllWorkspaces,
  getWorkspacesForUser
} from "../../features/workspace-foundation/models/workspace-storage";
import {
  getRegisteredUsers,
  getCurrentUser
} from "../../features/workspace-foundation/models/auth-storage";

test("workspace-storage returns empty structures gracefully outside browser", () => {
  assert.equal(EMPTY_WORKSPACE.id, "");
  assert.equal(EMPTY_WORKSPACE.name, "No Workspace Selected");
  assert.equal(DEFAULT_LEAD.email, "");
  assert.deepEqual(getAllWorkspaces(), []);
  assert.deepEqual(getWorkspacesForUser("test@example.com"), []);
});

test("auth-storage returns null/empty gracefully outside browser", () => {
  assert.deepEqual(getRegisteredUsers(), []);
  assert.equal(getCurrentUser(), null);
});
