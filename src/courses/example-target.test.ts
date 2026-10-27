import assert from "node:assert/strict";
import { test } from "node:test";
import { exampleTargetParts } from "./example-target";

test("uses the declared form and preserves the original sentence", () => {
  assert.deepEqual(exampleTargetParts("I like apples.", "apples"), ["I like ", "apples", "."]);
  assert.deepEqual(exampleTargetParts("Wash your Hands!", "hands"), ["Wash your ", "Hands", "!"]);
  assert.deepEqual(exampleTargetParts("Try C++ today.", "C++"), ["Try ", "C++", " today."]);
});

test("rejects absent, partial, ambiguous and malformed targets", () => {
  for (const [sentence, form] of [
    ["I like apples.", "apple"],
    ["The cattle sleep.", "cat"],
    ["A cat sees a cat.", "cat"],
    ["I like apples.", " apples "],
    ["I like apples.", ""],
  ]) assert.equal(exampleTargetParts(sentence, form), null);
  assert.equal(exampleTargetParts("I like apples.", undefined), null);
});
