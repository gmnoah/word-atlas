import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleCourses } from "./samples";
import { hanziPolicy } from "./hanzi-policy";
import { clearHanziCheckpoint, hanziCheckpointKey, readHanziCheckpoint, saveHanziCheckpoint, type HanziCheckpoint } from "./hanzi-checkpoint";
import { createLearningSession, currentStep, learningReducer } from "../learning/session";
import type { HanziEntry } from "./types";

const course = sampleCourses[1];
const lesson = course.lessons[0];
const entries = course.entries.filter(
  (entry): entry is HanziEntry => entry.kind === "hanzi" && lesson.entryIds.includes(entry.id),
);
const baseScope = {
  profileId: "child-a",
  courseId: course.manifest.id,
  lessonId: lesson.id,
  contentVersion: course.manifest.version,
  entries,
};
const scope = { ...baseScope, mode: "lesson" as const, voiceAvailable: false };

function memory() {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    },
  };
}

function fixture(mode: "lesson" | "co-read" = "lesson"): HanziCheckpoint {
  let session = createLearningSession({
    courseId: scope.courseId,
    contentVersion: scope.contentVersion,
    policy: hanziPolicy({ voiceAvailable: false, coReading: mode === "co-read", entryCount: 2 }),
    pool: entries,
    due: mode === "co-read" ? [] : [entries[0]],
    fresh: mode === "co-read" ? entries.slice(0, 2) : [],
    requestedNewCount: 2,
    introOnly: mode === "co-read",
    now: 1_000,
    seed: 9,
  });
  if (mode === "lesson") {
    const step = currentStep(session)!;
    session = learningReducer(session, { type: "answer", optionId: step.contentId, at: 1_200 });
  }
  return {
    version: 1,
    profileId: scope.profileId,
    courseId: scope.courseId,
    lessonId: scope.lessonId,
    mode,
    voiceAvailable: false,
    minutes: 5,
    session,
  };
}

test("T25/T27: a Hanzi checkpoint resumes with its first answer locked", () => {
  const { storage } = memory();
  const checkpoint = fixture();
  const raw = saveHanziCheckpoint(storage, checkpoint, null);
  assert.ok(raw);
  const restored = readHanziCheckpoint(storage, scope, 50_000);
  assert.equal(restored.status, "ok");
  if (restored.status !== "ok") return;
  const session = restored.checkpoint.session;
  assert.equal(session.answeredSteps[session.index], true);
  assert.equal(session.attempts[entries[0].id].grade, 3);
  const repeated = learningReducer(session, {
    type: "answer",
    optionId: currentStep(session)!.contentId,
    at: 50_001,
  });
  assert.deepEqual(repeated.attempts, session.attempts);
});

test("an original Hanzi lesson checkpoint survives the expansion", () => {
  const { storage } = memory();
  const checkpoint = fixture();
  checkpoint.session.contentVersion = "0.1.0-draft";
  saveHanziCheckpoint(storage, checkpoint, null);
  const restored = readHanziCheckpoint(storage, scope, 50_000);
  assert.equal(restored.status, "ok");
  if (restored.status === "ok") {
    assert.equal(restored.checkpoint.session.contentVersion, "0.7.0-draft");
    assert.deepEqual(restored.checkpoint.session.attempts, checkpoint.session.attempts);
  }
});

test("a 0.5 sample lesson resumes after its context is revised", () => {
  const { storage } = memory();
  const checkpoint = fixture();
  checkpoint.session.contentVersion = "0.5.0-draft";
  saveHanziCheckpoint(storage, checkpoint, null);
  const restored = readHanziCheckpoint(storage, scope, 50_000);
  assert.equal(restored.status, "ok");
  if (restored.status === "ok") {
    assert.equal(restored.checkpoint.session.contentVersion, scope.contentVersion);
    assert.deepEqual(restored.checkpoint.session.attempts, checkpoint.session.attempts);
  }
});

test("a 0.6 lesson resumes after the sample vocabulary is refined", () => {
  const { storage } = memory();
  const checkpoint = fixture();
  checkpoint.session.contentVersion = "0.6.0-draft";
  saveHanziCheckpoint(storage, checkpoint, null);
  const restored = readHanziCheckpoint(storage, scope, 50_000);
  assert.equal(restored.status, "ok");
  if (restored.status === "ok") {
    assert.equal(restored.checkpoint.session.contentVersion, scope.contentVersion);
    assert.deepEqual(restored.checkpoint.session.attempts, checkpoint.session.attempts);
  }
});

test("a 100-character course checkpoint survives the new version", () => {
  const { storage } = memory();
  const checkpoint = fixture();
  checkpoint.session.contentVersion = "0.2.0-draft";
  saveHanziCheckpoint(storage, checkpoint, null);
  const restored = readHanziCheckpoint(storage, scope, 50_000);
  assert.equal(restored.status, "ok");
  if (restored.status === "ok") assert.deepEqual(restored.checkpoint.session.attempts, checkpoint.session.attempts);
});

test("a 150-character course checkpoint survives the new version", () => {
  const { storage } = memory();
  const checkpoint = fixture();
  checkpoint.session.contentVersion = "0.3.0-draft";
  saveHanziCheckpoint(storage, checkpoint, null);
  const restored = readHanziCheckpoint(storage, scope, 50_000);
  assert.equal(restored.status, "ok");
  if (restored.status === "ok") assert.deepEqual(restored.checkpoint.session.attempts, checkpoint.session.attempts);
});

test("a newly added 150-character lesson resumes after expansion to 300", () => {
  const { storage } = memory();
  const expandedLesson = course.lessons.find((item) => item.id === "draft-hanzi-09")!;
  const expandedEntries = course.entries.filter((entry) => expandedLesson.entryIds.includes(entry.id));
  const expandedScope = { ...scope, lessonId: expandedLesson.id, entries: expandedEntries, mode: "co-read" as const };
  const session = createLearningSession({
    courseId: scope.courseId, contentVersion: "0.3.0-draft",
    policy: hanziPolicy({ voiceAvailable: false, coReading: true, entryCount: 2, disablePicture: true }),
    pool: expandedEntries, fresh: expandedEntries, due: [], requestedNewCount: 2,
    introOnly: true, now: 1000, seed: 9,
  });
  const checkpoint: HanziCheckpoint = { version: 1, profileId: scope.profileId, courseId: scope.courseId,
    lessonId: expandedLesson.id, mode: "co-read", voiceAvailable: false, minutes: 5, session };
  saveHanziCheckpoint(storage, checkpoint, null);
  const restored = readHanziCheckpoint(storage, expandedScope, 50_000);
  assert.equal(restored.status, "ok");
  if (restored.status === "ok") assert.equal(restored.checkpoint.session.contentVersion, "0.7.0-draft");
});

test("a saved 0.4 lesson resumes after a pronunciation correction", () => {
  const { storage } = memory();
  const currentLesson = course.lessons.find((item) => item.id === "draft-hanzi-20")!;
  const currentEntries = course.entries.filter((entry) => currentLesson.entryIds.includes(entry.id));
  const currentScope = { ...scope, lessonId: currentLesson.id, entries: currentEntries, mode: "co-read" as const };
  const session = createLearningSession({ courseId: scope.courseId, contentVersion: "0.4.0-draft",
    policy: hanziPolicy({ voiceAvailable: false, coReading: true, entryCount: 2, disablePicture: true }),
    pool: currentEntries, fresh: currentEntries, due: [], requestedNewCount: 2, introOnly: true, now: 1000, seed: 9 });
  saveHanziCheckpoint(storage, { version: 1, profileId: scope.profileId, courseId: scope.courseId,
    lessonId: currentLesson.id, mode: "co-read", voiceAvailable: false, minutes: 5, session }, null);
  const restored = readHanziCheckpoint(storage, currentScope, 50_000);
  assert.equal(restored.status, "ok");
  if (restored.status === "ok") assert.equal(restored.checkpoint.session.contentVersion, "0.7.0-draft");
});

test("T26: co-reading checkpoints keep browsing-only sessions", () => {
  const { storage } = memory();
  const checkpoint = fixture("co-read");
  assert.equal(saveHanziCheckpoint(storage, checkpoint, null) !== null, true);
  const restored = readHanziCheckpoint(storage, { ...baseScope, mode: "co-read", voiceAvailable: false }, 50_000);
  assert.equal(restored.status, "ok");
  if (restored.status !== "ok") return;
  assert.equal(restored.checkpoint.mode, "co-read");
  assert.equal(restored.checkpoint.session.timeLimitMs, null);
  assert.ok(restored.checkpoint.session.steps.every((step) => step.kind === "intro"));
});

test("T25: another learner, another lesson or a damaged record cannot resume", () => {
  const { storage, values } = memory();
  const raw = saveHanziCheckpoint(storage, fixture(), null)!;
  assert.equal(readHanziCheckpoint(storage, { ...scope, profileId: "child-b" }, 2_000).status, "empty");
  assert.equal(readHanziCheckpoint(storage, { ...scope, contentVersion: "v2" }, 2_000).status, "invalid");
  assert.equal(saveHanziCheckpoint(storage, fixture(), null), null);
  assert.equal(clearHanziCheckpoint(storage, scope, null), false);
  const key = hanziCheckpointKey(scope.profileId, scope.courseId, scope.lessonId, scope.mode);
  assert.equal(values.get(key), raw);
  values.set(key, "broken");
  assert.equal(readHanziCheckpoint(storage, scope, 2_000).status, "invalid");
  assert.equal(values.get(key), "broken");
  assert.equal(clearHanziCheckpoint(storage, scope, raw), false);
  assert.equal(values.get(key), "broken");
  values.set(key, raw);
  assert.equal(clearHanziCheckpoint(storage, scope, raw), true);
  assert.equal(values.get(key), undefined);
});

test("T25: an impossible checkpoint mode or duration is rejected", () => {
  const { storage, values } = memory();
  const key = hanziCheckpointKey(scope.profileId, scope.courseId, scope.lessonId, scope.mode);
  const valid = fixture();
  for (const patch of [
    { mode: "write" },
    { voiceAvailable: "yes" },
    { minutes: -1 },
    { minutes: "5" },
    { version: 2 },
  ]) {
    values.set(key, JSON.stringify({ ...valid, ...patch }));
    assert.equal(readHanziCheckpoint(storage, scope, 2_000).status, "invalid");
  }
});

test("T25: a checkpoint saved with a voice reopens without one on another device", () => {
  const { storage } = memory();
  const checkpoint = { ...fixture(), voiceAvailable: true };
  assert.ok(saveHanziCheckpoint(storage, checkpoint, null));
  const restored = readHanziCheckpoint(storage, { ...scope, voiceAvailable: false }, 50_000);
  assert.equal(restored.status, "ok");
  if (restored.status !== "ok") return;
  assert.equal(restored.checkpoint.voiceAvailable, false);
  assert.ok(restored.checkpoint.session.steps.every((step) => step.kind !== "hanzi-listen"));
});
