import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleCourses } from "./samples";
import { createPreviewSession } from "./preview-session";
import { entriesFromStartingPoint, primaryPreviewCount, primaryVisualPolicy } from "./starting-point";
import { createLearningSession, currentStep, learningReducer } from "../learning/session";

const entries = sampleCourses[0].entries.slice(0, 5);

test("T20: selecting the last word starts there and wraps to supply other options", () => {
  const rotated = entriesFromStartingPoint(entries, entries[4].id);
  const session = createPreviewSession(rotated, 2, 1);
  assert.deepEqual(session.steps.slice(0, 2).map((step) => step.entryId), [entries[4].id, entries[0].id]);
  assert.equal(session.steps.filter((step) => step.kind === "recall").length, 2);
  assert.deepEqual(entriesFromStartingPoint(entries, "unknown"), entries);
});

test("T20: preview stage limits respect the caregiver's smaller selection", () => {
  assert.equal(primaryPreviewCount(5, "starter"), 3);
  assert.equal(primaryPreviewCount(5, "advanced"), 5);
  assert.equal(primaryPreviewCount(2, "advanced"), 2);
});

test("T20: stages drive actual P2 session limits, grouping and visual question eligibility", () => {
  for (const [stage, limit, groupSize, optionCount] of [["starter", 3, 2, 2], ["advanced", 5, 3, 3]] as const) {
    const policy = primaryVisualPolicy(stage);
    const session = createLearningSession({
      courseId: "primary-starter", contentVersion: "draft", policy, pool: entries,
      fresh: entries, due: [], requestedNewCount: 5, now: 1000, seed: 1,
    });
    assert.equal(session.policyId, policy.id);
    assert.equal(session.newIds.length, limit);
    assert.ok(session.steps.slice(0, groupSize).every((step) => step.kind === "intro"));
    assert.ok(policy.allowedKinds.some((kind) => kind === session.steps[groupSize].kind));
    assert.equal(session.steps[groupSize].options?.length, optionCount);
    assert.equal(session.timeLimitMs, policy.timeLimitMs);
  }
});

test("T22: spelling is opt-in and never enabled for the starter stage", () => {
  assert.equal(primaryVisualPolicy("starter", true).allowedKinds.some((kind) => kind === "spell"), false);
  assert.equal(primaryVisualPolicy("advanced").allowedKinds.some((kind) => kind === "spell"), false);
  assert.equal(primaryVisualPolicy("advanced", true).allowedKinds.some((kind) => kind === "spell"), true);
});

test("T22: spelling submission is normalized and a repeated answer cannot change the first result", () => {
  const policy = { ...primaryVisualPolicy("advanced", true), allowedKinds: ["spell"] as const };
  let session = createLearningSession({
    courseId: "primary-starter", contentVersion: "draft", policy, pool: entries,
    fresh: [], due: [entries[0]], now: 1000, seed: 1,
  });
  const step = currentStep(session);
  assert.equal(step?.kind, "spell");
  session = learningReducer(session, { type: "answer", at: 2000, value: " APPLE " });
  const first = session.attempts[entries[0].id];
  assert.equal(first.result.outcome, "answered");
  assert.equal(first.result.outcome === "answered" && first.result.correct, true);
  session = learningReducer(session, { type: "answer", at: 2100, value: "wrong" });
  assert.equal(session.attempts[entries[0].id], first);
});
