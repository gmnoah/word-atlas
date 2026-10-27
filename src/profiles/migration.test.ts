import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { migrateV2ToV3, type StorageLike } from "./migration";

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();
  blockedPrefix: string | null = null;

  constructor(seed: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(seed)) this.values.set(key, JSON.stringify(value));
  }
  get length() {
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.blockedPrefix && key.startsWith(this.blockedPrefix)) throw new Error("quota");
    this.values.set(key, value);
  }
  json(key: string): unknown {
    const value = this.getItem(key);
    return value ? JSON.parse(value) : null;
  }
}

const fixture = () =>
  JSON.parse(fs.readFileSync("tests/fixtures/legacy/storage-v2.json", "utf8")) as Record<string, unknown>;
const v2ProgressKey = "word-atlas:v2:word-atlas-open";
const v3ProgressKey = "word-atlas:v3:progress:learner-default:word-atlas-open";
const completionKey = "word-atlas:v3:migration:v2-complete";

test("T09: v2 migration snapshots first, preserves old data, then writes split v3 records", () => {
  const source = fixture();
  const storage = new MemoryStorage(source);
  const result = migrateV2ToV3(storage);

  assert.deepEqual(result, { status: "migrated", courses: ["word-atlas-open"] });
  assert.deepEqual(storage.json(v2ProgressKey), source[v2ProgressKey], "v2 source is never altered");
  assert.equal((storage.json("word-atlas:v3:migration:v2-snapshot") as { version: number }).version, 1);
  assert.equal((storage.json(completionKey) as { version: number }).version, 1);

  const progress = storage.json(v3ProgressKey) as { version: number; profileId: string; cards: Record<string, unknown>; session: unknown };
  assert.equal(progress.version, 3);
  assert.equal(progress.profileId, "learner-default");
  assert.ok(progress.cards.apple);
  assert.ok(progress.session, "valid legacy sessions are retained");

  const device = storage.json("word-atlas:v3:device-settings") as { theme: string; ambience: string };
  assert.deepEqual(device, { version: 3, theme: "dark", sfx: true, ambience: "off", ambienceVolume: 0.45, splash: false });
  const courseSettings = storage.json("word-atlas:v3:course-settings:learner-default:word-atlas-open") as { dailyNew: number; accent: string };
  assert.equal(courseSettings.dailyNew, 10);
  assert.equal(courseSettings.accent, "uk");

  assert.deepEqual(migrateV2ToV3(storage), { status: "already-migrated", courses: ["word-atlas-open"] });
});

test("T09: a failed v3 write leaves v2 readable and resumes from the exact snapshot", () => {
  const source = fixture();
  const storage = new MemoryStorage(source);
  storage.blockedPrefix = "word-atlas:v3:device-settings";

  const failed = migrateV2ToV3(storage);
  assert.equal(failed.status, "failed");
  assert.equal(storage.getItem(completionKey), null, "a failed run never claims completion");
  assert.deepEqual(storage.json(v2ProgressKey), source[v2ProgressKey]);
  assert.ok(storage.getItem("word-atlas:v3:migration:v2-snapshot"), "snapshot remains for safe retry");

  storage.blockedPrefix = null;
  assert.deepEqual(migrateV2ToV3(storage), { status: "migrated", courses: ["word-atlas-open"] });
  assert.ok(storage.json(v3ProgressKey));
});

test("T09: malformed legacy progress or conflicting partial v3 data is never silently overwritten", () => {
  const malformed = new MemoryStorage({
    "word-atlas:v2:word-atlas-open": { version: 2, datasetId: "other-course" },
  });
  const malformedResult = migrateV2ToV3(malformed);
  assert.equal(malformedResult.status, "failed");
  assert.equal(malformed.getItem("word-atlas:v3:migration:v2-snapshot"), null);

  const storage = new MemoryStorage(fixture());
  storage.blockedPrefix = "word-atlas:v3:device-settings";
  migrateV2ToV3(storage);
  storage.blockedPrefix = null;
  storage.setItem("word-atlas:v3:device-settings", JSON.stringify({ version: 3, theme: "light" }));
  const conflict = migrateV2ToV3(storage);
  assert.equal(conflict.status, "failed");
  assert.equal(storage.getItem(completionKey), null);
  assert.deepEqual(storage.json(v2ProgressKey), fixture()[v2ProgressKey]);

  const brokenMarker = new MemoryStorage(fixture());
  brokenMarker.setItem(completionKey, "{not-json");
  const markerResult = migrateV2ToV3(brokenMarker);
  assert.equal(markerResult.status, "failed");
  assert.equal(brokenMarker.getItem("word-atlas:v3:migration:v2-snapshot"), null);
});
