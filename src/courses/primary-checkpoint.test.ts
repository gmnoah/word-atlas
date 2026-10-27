import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleCourses } from "./samples";
import { primaryVisualPolicy } from "./starting-point";
import { createLearningSession, currentStep, learningReducer } from "../learning/session";
import { checkpointKey, clearCheckpoint, readCheckpoint, saveCheckpoint, type Checkpoint } from "./primary-checkpoint";

const course = sampleCourses[0];
const lesson = course.lessons[0];
const entries = course.entries.filter((entry) => lesson.entryIds.includes(entry.id));
const scope = { profileId: "child-a", courseId: course.manifest.id, lessonId: lesson.id, contentVersion: course.manifest.version, entries };
function fixture() {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  let session = createLearningSession({ courseId: scope.courseId, contentVersion: scope.contentVersion, policy: primaryVisualPolicy("starter"), pool: entries, fresh: entries, due: [], now: 1000, seed: 1 });
  while (currentStep(session)?.kind === "intro") session = learningReducer(session, { type: "next", at: 1100 });
  const target = currentStep(session)!;
  session = learningReducer(session, { type: "answer", optionId: target.contentId, at: 1200 });
  const checkpoint: Checkpoint = { version: 1, ...scope, stage: "starter", spellingEnabled: false, session };
  return { storage, values, checkpoint };
}

test("a saved answered question resumes locked and can advance", () => {
  const { storage, checkpoint } = fixture();
  const raw = saveCheckpoint(storage, checkpoint, null);
  assert.ok(raw);
  const restored = readCheckpoint(storage, scope, 50000);
  assert.equal(restored.status, "ok");
  if (restored.status !== "ok") return;
  const session = restored.checkpoint.session;
  assert.equal(session.answeredSteps[session.index], true);
  assert.deepEqual(learningReducer(session, { type: "answer", optionId: currentStep(session)!.contentId, at: 50001 }).attempts, session.attempts);
  assert.ok(learningReducer(session, { type: "next", at: 50002 }).index > session.index);
  assert.equal(session.lastTickAt, 50000);
});

test("other learners, incompatible content and concurrent tabs cannot overwrite a checkpoint", () => {
  const { storage, values, checkpoint } = fixture();
  const raw = saveCheckpoint(storage, checkpoint, null)!;
  assert.equal(readCheckpoint(storage, { ...scope, profileId: "child-b" }, 2000).status, "empty");
  assert.equal(readCheckpoint(storage, { ...scope, contentVersion: "different" }, 2000).status, "invalid");
  assert.equal(saveCheckpoint(storage, checkpoint, null), null);
  assert.equal(clearCheckpoint(storage, scope, null), false);
  assert.equal(values.get(checkpointKey(scope.profileId, scope.courseId, scope.lessonId)), raw);
  assert.equal(clearCheckpoint(storage, scope, raw), true);
  values.set(checkpointKey(scope.profileId, scope.courseId, scope.lessonId), "broken");
  assert.equal(readCheckpoint(storage, scope, 2000).status, "invalid");
  assert.equal(values.get(checkpointKey(scope.profileId, scope.courseId, scope.lessonId)), "broken");
});
