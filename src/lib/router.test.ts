import assert from "node:assert/strict";
import { test } from "node:test";
import { href, parseLocation } from "./router";

test("T11: new course routes retain course identity and round-trip safely", () => {
  const location = parseLocation("#/explore?course=primary-starter&entry=en-apple");
  assert.deepEqual(location, {
    route: { page: "explore", courseId: "primary-starter", entryId: "en-apple" },
    word: null,
  });
  assert.equal(href(location.route), "#/explore?course=primary-starter&entry=en-apple");
});

test("T11: legacy word links still resolve to the default IELTS atlas", () => {
  assert.deepEqual(parseLocation("#/w/apple"), { route: { page: "atlas" }, word: "apple" });
  const queryWord = parseLocation("#/atlas?w=apple");
  assert.equal(queryWord.route.page, "atlas");
  assert.equal(queryWord.word, "apple");
  assert.deepEqual(parseLocation("#/explore?course=not-a-course"), {
    route: { page: "explore", courseId: "not-a-course", entryId: undefined },
    word: null,
  });
});
