import assert from "node:assert/strict";
import test from "node:test";
import { resetCourseProgress, resetAllLearningProgress } from "./reset-progress";

function createMockStorage(init: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(init));
  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

test("resetCourseProgress cleans only target learner and course records", () => {
  const storage = createMockStorage({
    "word-atlas:v3:primary-progress:child:middle-english": JSON.stringify({ version: 1 }),
    "word-atlas:v3:activity:child:middle-english": JSON.stringify({ version: 1 }),
    "word-atlas:v3:primary-session:child:middle-english:campus-life": JSON.stringify({ step: 1 }),
    // Other course of same child
    "word-atlas:v3:primary-progress:child:primary-starter": JSON.stringify({ version: 1 }),
    // Same course of another child
    "word-atlas:v3:primary-progress:other:middle-english": JSON.stringify({ version: 1 }),
    // Settings
    "word-atlas:profiles:v1": JSON.stringify([{ id: "child" }]),
    "word-atlas:settings": JSON.stringify({ theme: "dark" }),
  });

  resetCourseProgress(storage, "child", "middle-english");

  // Targets removed
  assert.equal(storage.getItem("word-atlas:v3:primary-progress:child:middle-english"), null);
  assert.equal(storage.getItem("word-atlas:v3:activity:child:middle-english"), null);
  assert.equal(storage.getItem("word-atlas:v3:primary-session:child:middle-english:campus-life"), null);

  // Other records untouched
  assert.ok(storage.getItem("word-atlas:v3:primary-progress:child:primary-starter"));
  assert.ok(storage.getItem("word-atlas:v3:primary-progress:other:middle-english"));
  assert.ok(storage.getItem("word-atlas:profiles:v1"));
  assert.ok(storage.getItem("word-atlas:settings"));
});

test("resetAllLearningProgress cleans all progress while preserving profiles and settings", () => {
  const storage = createMockStorage({
    "word-atlas:v3:primary-progress:child:middle-english": JSON.stringify({ version: 1 }),
    "word-atlas:v3:primary-progress:child:primary-starter": JSON.stringify({ version: 1 }),
    "word-atlas:v3:activity:child:hanzi-starter": JSON.stringify({ version: 1 }),
    "word-atlas:v2:word-atlas-open": JSON.stringify({ cards: {} }),
    // Settings to preserve
    "word-atlas:profiles:v1": JSON.stringify([{ id: "child" }]),
    "word-atlas:course-settings:v1": JSON.stringify({}),
    "word-atlas:settings": JSON.stringify({ theme: "dark" }),
    "word-atlas:v3:device-settings": JSON.stringify({ theme: "dark" }),
  });

  resetAllLearningProgress(storage);

  assert.equal(storage.getItem("word-atlas:v3:primary-progress:child:middle-english"), null);
  assert.equal(storage.getItem("word-atlas:v3:primary-progress:child:primary-starter"), null);
  assert.equal(storage.getItem("word-atlas:v3:activity:child:hanzi-starter"), null);
  assert.equal(storage.getItem("word-atlas:v2:word-atlas-open"), null);

  // Preserved
  assert.ok(storage.getItem("word-atlas:profiles:v1"));
  assert.ok(storage.getItem("word-atlas:course-settings:v1"));
  assert.ok(storage.getItem("word-atlas:settings"));
  assert.ok(storage.getItem("word-atlas:v3:device-settings"));
});
