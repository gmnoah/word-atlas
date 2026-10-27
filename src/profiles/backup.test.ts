import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { applyRestore, exportFullBackup, preflightRestore } from "./backup";

class MemoryStorage {
  private values = new Map<string, string>();
  constructor(seed: Record<string, unknown> = {}) { for (const [key, value] of Object.entries(seed)) this.values.set(key, JSON.stringify(value)); }
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  json(key: string) { const raw = this.getItem(key); return raw ? JSON.parse(raw) : null; }
}
const read = (file: string) => fs.readFileSync(`tests/fixtures/legacy/${file}`, "utf8");

test("T10: full backup preflights and replaces only Word Atlas local records", () => {
  const source = new MemoryStorage(JSON.parse(read("storage-v2.json")));
  const backup = exportFullBackup(source);
  const checked = preflightRestore(backup);
  assert.equal(checked.ok, true);
  if (!checked.ok) return;
  assert.equal(checked.plan.kind, "v3");

  const target = new MemoryStorage({
    "word-atlas:v2:word-atlas-open": { version: 2, datasetId: "word-atlas-open", cards: { changed: true } },
    "other-app:data": { keep: true },
  });
  const restored = applyRestore(target, checked.plan);
  assert.equal(restored.ok, true);
  assert.deepEqual(target.json("word-atlas:v2:word-atlas-open"), source.json("word-atlas:v2:word-atlas-open"));
  assert.deepEqual(target.json("other-app:data"), { keep: true });
});

test("T10: legacy v2 backup imports into the default IELTS learner and invalid files do nothing", () => {
  const checked = preflightRestore(read("backup-v2.json"));
  assert.equal(checked.ok, true);
  if (!checked.ok) return;
  assert.equal(checked.plan.kind, "legacy-v2");
  const target = new MemoryStorage({ "other-app:data": { keep: true } });
  const restored = applyRestore(target, checked.plan);
  assert.equal(restored.ok, true);
  assert.equal((target.json("word-atlas:v3:progress:learner-default:word-atlas-open") as { version: number }).version, 3);
  assert.deepEqual(target.json("other-app:data"), { keep: true });
  assert.equal(preflightRestore("not-json").ok, false);
});
