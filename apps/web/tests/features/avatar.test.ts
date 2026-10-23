import test from "node:test";
import assert from "node:assert/strict";
import { getAvatarColor } from "@/features/workspace-foundation";

void test("getAvatarColor returns consistent color for the same name", () => {
  const c1 = getAvatarColor("Alice Smith");
  const c2 = getAvatarColor("Alice Smith");
  const c3 = getAvatarColor("Bob Jones");

  assert.deepEqual(c1, c2);
  assert.ok(c1.bg);
  assert.ok(c1.text);
  assert.notDeepEqual(c1, c3);
});
