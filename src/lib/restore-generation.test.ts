import assert from "node:assert/strict";
import test from "node:test";
import { readRestoreGeneration, RESTORE_GENERATION_KEY } from "./restore-generation";

test("an unreadable restore marker degrades safely instead of breaking the lesson", () => {
  assert.equal(readRestoreGeneration({
    getItem(key) {
      assert.equal(key, RESTORE_GENERATION_KEY);
      throw new DOMException("denied", "SecurityError");
    },
  }), null);
});
