import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultLearningPreferences,
  normalizeNickname,
  preferencesFor,
  profileStore,
  sanitizeCoursePreferences,
  sanitizeProfiles,
  type ProfileState,
} from "./store";

test("T08: profile sanitizer keeps only bounded, unique local nicknames", () => {
  const profiles = sanitizeProfiles({
    version: 1,
    activeProfileId: "second",
    profiles: [
      { id: "first", nickname: " 小树 ", createdAt: 1 },
      { id: "first", nickname: "重复", createdAt: 2 },
      { id: "second", nickname: "月亮", createdAt: 3 },
      { id: "bad", nickname: "\u0000", createdAt: 4 },
    ],
  });
  assert.deepEqual(profiles, {
    activeProfileId: "second",
    profiles: [
      { id: "first", nickname: "小树", createdAt: 1 },
      { id: "second", nickname: "月亮", createdAt: 3 },
    ],
  });
  assert.equal(normalizeNickname("一二三四五六七八九十十一二三四五六七"), null);
});

test("T08: course preferences are validated and isolated by learner plus course", () => {
  const coursePreferences = sanitizeCoursePreferences({
    version: 1,
    coursePreferences: {
      "a:primary-starter": { englishCount: 5, hanziCount: 2, slow: false },
      "a:bad key": { englishCount: 3, hanziCount: 2, slow: true },
      "b:primary-starter": { englishCount: 4, hanziCount: 2, slow: true },
    },
  });
  const state = {
    version: 1,
    activeProfileId: "a",
    profiles: [],
    coursePreferences,
  } satisfies ProfileState;
  assert.deepEqual(preferencesFor(state, "a", "primary-starter"), {
    englishCount: 5,
    hanziCount: 2,
    slow: false,
  });
  assert.equal(preferencesFor(state, "b", "primary-starter"), defaultLearningPreferences);
});

test("T08: creating a learner and changing a course preference does not touch another learner", () => {
  const originalId = profileStore.get().activeProfileId;
  const created = profileStore.add("小熊");
  assert.equal(created.ok, true);
  if (!created.ok) return;

  profileStore.setCoursePreferences(created.profile.id, "primary-starter", { englishCount: 5 });
  assert.equal(
    preferencesFor(profileStore.get(), created.profile.id, "primary-starter").englishCount,
    5,
  );
  assert.equal(
    preferencesFor(profileStore.get(), originalId, "primary-starter").englishCount,
    3,
  );
  profileStore.select(originalId);
});
