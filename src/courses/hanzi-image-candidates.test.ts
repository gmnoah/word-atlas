import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { test } from "node:test";

const inventory = "data/drafts/hanzi-image-candidates.json";
test("review-only Hanzi image candidates have unique identities and intact files", { skip: !fs.existsSync(inventory) }, () => {
  const data = JSON.parse(fs.readFileSync(inventory, "utf8"));
  const pack = JSON.parse(fs.readFileSync("data/drafts/hanzi-100.json", "utf8"));
  const byId = new Map(pack.entries.map((entry: { id: string; character: string }) => [entry.id, entry.character]));
  assert.equal(new Set(data.candidates.map((entry: { entryId: string }) => entry.entryId)).size, data.candidates.length);
  for (const item of data.candidates) {
    assert.equal(byId.get(item.entryId), item.character);
    assert.equal(item.reviewStatus, "draft");
    assert.ok(item.reviewNote && item.source);
    assert.match(item.file, /^(public\/atlas\/img|data\/drafts\/images)\//);
    const digest = createHash("sha256").update(fs.readFileSync(item.file)).digest("hex");
    assert.equal(digest, item.sha256, item.character);
  }
});
