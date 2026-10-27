import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyPrimaryProgress } from "../learning/primary-progress";
import { readPrimaryProgress } from "../learning/primary-progress";
import { applyRestore, exportFullBackup, preflightRestore } from "./backup";

class MemoryStorage {
  private values = new Map<string, string>();
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
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  json(key: string) {
    const raw = this.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
}

test("T28: family backup round-trips Hanzi progress for every learner", () => {
  const source = new MemoryStorage({
    "word-atlas:profiles:v1": {
      version: 1,
      activeProfileId: "child-b",
      profiles: [
        { id: "child-a", nickname: "小树", createdAt: 1 },
        { id: "child-b", nickname: "月亮", createdAt: 2 },
      ],
    },
    "word-atlas:course-settings:v1": {
      version: 1,
      coursePreferences: {
        "child-a:hanzi-starter": { englishCount: 2, hanziCount: 5, slow: true, minutes: 3 },
        "child-b:hanzi-starter": { englishCount: 3, hanziCount: 2, slow: false, minutes: 8 },
      },
    },
    "word-atlas:v3:primary-progress:child-a:hanzi-starter": {
      ...emptyPrimaryProgress("child-a", "hanzi-starter"),
      introduced: { "hanzi-u5c71": 10 },
      favorites: ["hanzi-u5c71"],
    },
  });
  const checked = preflightRestore(exportFullBackup(source));
  assert.equal(checked.ok, true);
  if (!checked.ok) return;
  assert.equal(checked.plan.profileCount, 2);
  assert.ok(checked.plan.courses.includes("hanzi-starter"));

  const target = new MemoryStorage({ "other-app:data": { keep: true } });
  const restored = applyRestore(target, checked.plan);
  assert.equal(restored.ok, true);
  const hanzi = readPrimaryProgress(target, "child-a", "hanzi-starter");
  assert.equal(hanzi.ok, true);
  if (!hanzi.ok) return;
  assert.deepEqual(hanzi.progress.favorites, ["hanzi-u5c71"]);
  assert.equal(hanzi.progress.introduced["hanzi-u5c71"], 10);
  const settings = target.json("word-atlas:course-settings:v1") as {
    coursePreferences: Record<string, { minutes: number }>;
  };
  assert.equal(settings.coursePreferences["child-a:hanzi-starter"].minutes, 3);
  assert.equal(settings.coursePreferences["child-b:hanzi-starter"].minutes, 8);
  assert.deepEqual(target.json("other-app:data"), { keep: true });
});

test("T28: an old preference without minutes still restores as the stage default", () => {
  const source = new MemoryStorage({
    "word-atlas:course-settings:v1": {
      version: 1,
      coursePreferences: {
        "child-a:hanzi-starter": { englishCount: 2, hanziCount: 2, slow: true },
      },
    },
  });
  const checked = preflightRestore(exportFullBackup(source));
  assert.equal(checked.ok, true);
  if (!checked.ok) return;
  const target = new MemoryStorage();
  assert.equal(applyRestore(target, checked.plan).ok, true);
  const settings = target.json("word-atlas:course-settings:v1") as {
    coursePreferences: Record<string, { minutes?: number }>;
  };
  // The raw record is preserved byte-for-byte; the runtime sanitizer fills 0.
  assert.equal(settings.coursePreferences["child-a:hanzi-starter"].minutes, undefined);
});
