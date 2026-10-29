import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { validateCourseInput } from "./validate-input";

test("review-only expansion has 300 words and 100 characters with no invented approval", { skip: !fs.existsSync("data/drafts/primary-300.json") || !fs.existsSync("data/drafts/hanzi-100.json") }, () => {
  for (const [name, count] of [["primary-300.json", 300], ["hanzi-100.json", 100]] as const) {
    const pack = JSON.parse(fs.readFileSync(`data/drafts/${name}`, "utf8"));
    assert.equal(pack.entries.length, count);
    assert.ok(pack.entries.every((entry: { reviewStatus: string }) => entry.reviewStatus === "draft"));
    const report = validateCourseInput(pack, (relative) => fs.existsSync(`public/${relative}`));
    assert.deepEqual(report.errors, []);
    assert.ok(report.releaseBlockers.filter((issue) => issue.code === "unreviewed").length === count);
  }
});
