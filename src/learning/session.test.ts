import assert from "node:assert/strict";
import { test } from "node:test";
import type { EnglishEntry } from "../courses/types";
import { Rating } from "../store/srs";
import {
  PRIMARY_STARTER_POLICY,
  withPolicyOverrides,
  type LearningPolicy,
} from "./policy";
import {
  createLearningSession,
  currentStep,
  learningReducer,
  learningSessionStats,
} from "./session";

function entry(id: string, media: { image?: string | null; recording?: string | null } = {}): EnglishEntry {
  return {
    kind: "english",
    id,
    topicId: "test",
    word: id.replace(/-/g, ""),
    meaning: `意思-${id}`,
    example: { text: `This is ${id}.`, translation: `这是${id}。` },
    media: {
      image: media.image === undefined ? `atlas/img/${id}.webp` : media.image,
      recording:
        media.recording === undefined ? `atlas/audio/uk/${id}.mp3` : media.recording,
      locale: "en-GB",
      source: "test fixture",
    },
    reviewStatus: "draft",
    caregiverTip: "",
  };
}

const many = Array.from({ length: 30 }, (_, index) => entry(`en-word-${index}`));

function single(
  target: EnglishEntry,
  pool: EnglishEntry[],
  policy: LearningPolicy = PRIMARY_STARTER_POLICY,
) {
  return createLearningSession({
    courseId: "primary-starter",
    contentVersion: "test-v1",
    policy,
    pool,
    due: [target],
    fresh: [],
    now: 1_000,
    seed: 42,
  });
}

function correctOption(session: ReturnType<typeof createLearningSession>): string {
  const step = currentStep(session);
  assert.ok(step && step.options);
  return step.contentId;
}

function wrongOption(session: ReturnType<typeof createLearningSession>): string {
  const step = currentStep(session);
  assert.ok(step?.options);
  const wrong = step.options.find((id) => id !== step.contentId);
  assert.ok(wrong);
  return wrong;
}

test("T13/T17: due reviews are capped and new content respects the stage limit", () => {
  const fresh = many.slice(20, 25);
  const session = createLearningSession({
    courseId: "primary-starter",
    contentVersion: "test-v1",
    policy: PRIMARY_STARTER_POLICY,
    pool: many,
    due: many.slice(0, 20),
    fresh,
    requestedNewCount: 5,
    now: 1_000,
    seed: 1,
  });
  assert.equal(session.reviewIds.length, 8);
  assert.equal(session.newIds.length, 3);
  assert.equal(session.steps.filter((step) => step.kind === "intro").length, 3);
  assert.equal(session.steps.length, 8 + 3 + 3);
});

test("T15/T17: a pool with no second option never creates a broken question", () => {
  const target = entry("en-alone");
  const session = createLearningSession({
    courseId: "primary-starter",
    contentVersion: "test-v1",
    policy: PRIMARY_STARTER_POLICY,
    pool: [target],
    due: [target],
    fresh: [target],
    now: 1_000,
    seed: 2,
  });
  assert.equal(session.steps.filter((step) => step.kind !== "intro").length, 0);
  assert.equal(session.steps.length, 1);
  assert.equal(session.endedAt, undefined);
});

test("T16: repeated clicks cannot change or duplicate the first attempt", () => {
  const target = entry("en-repeat");
  let session = single(target, many);
  const at = 2_000;
  session = learningReducer(session, {
    type: "answer",
    at,
    optionId: correctOption(session),
  });
  const first = session.attempts[target.id];
  assert.equal(first.grade, Rating.Good);
  session = learningReducer(session, {
    type: "answer",
    at: at + 1,
    optionId: correctOption(session),
  });
  assert.equal(Object.keys(session.attempts).length, 1);
  assert.equal(session.attempts[target.id], first);
  assert.equal(session.practice.length, 0);
});

test("T18: a wrong answer inserts at most two practice retries and none are graded", () => {
  const target = entry("en-retry");
  let session = single(target, many);
  session = learningReducer(session, {
    type: "answer",
    at: 2_000,
    optionId: wrongOption(session),
  });
  const result = session.attempts[target.id].result;
  assert.equal(result.outcome, "answered");
  if (result.outcome === "answered") assert.equal(result.correct, false);
  assert.equal(session.retryPlans[target.id].length, 2);

  session = learningReducer(session, { type: "next", at: 2_100 });
  assert.equal(currentStep(session)?.retry, true);
  const retry = currentStep(session);
  session = learningReducer(session, { type: "next", at: 2_150 });
  assert.equal(currentStep(session), retry);
  assert.equal(session.practice.length, 0);
  session = learningReducer(session, {
    type: "answer",
    at: 2_200,
    optionId: wrongOption(session),
  });
  assert.equal(session.practice.length, 1);
  assert.equal(session.practice[0].counted, false);
  assert.equal(session.practice[0].grade, null);

  session = learningReducer(session, { type: "next", at: 2_300 });
  session = learningReducer(session, {
    type: "answer",
    at: 2_400,
    optionId: wrongOption(session),
  });
  assert.equal(session.practice.length, 2);
  assert.equal(session.steps.filter((step) => step.retry).length, 2);

  session = learningReducer(session, { type: "next", at: 2_500 });
  assert.equal(session.endReason, "completed");
  assert.deepEqual(learningSessionStats(session), {
    introduced: 0,
    independent: 0,
    hinted: 0,
    assisted: 0,
    supported: 0,
    skipped: 0,
    resourceErrors: 0,
    retries: 2,
    activeMs: session.activeMs,
  });
});

test("T18: retries obey resource eligibility and are skipped when no alternative exists", () => {
  const noAudio = entry("en-image-only", { recording: null });
  let session = single(noAudio, many);
  assert.equal(currentStep(session)?.kind, "picture-word");
  session = learningReducer(session, {
    type: "answer",
    at: 2_000,
    optionId: wrongOption(session),
  });
  assert.deepEqual(session.retryPlans[noAudio.id], []);
  assert.equal(session.steps.filter((step) => step.retry).length, 0);
});

test("T16: skip and resource failure never create a grade or a wrong answer", () => {
  const skipped = single(entry("en-skip"), many);
  const afterSkip = learningReducer(skipped, { type: "skip", at: 2_000 });
  assert.deepEqual(afterSkip.attempts["en-skip"].result, {
    outcome: "skipped",
    contentId: "en-skip",
  });
  assert.equal(afterSkip.attempts["en-skip"].grade, null);
  assert.equal(learningSessionStats(afterSkip).skipped, 1);

  const failed = single(entry("en-failed"), many);
  const afterFailure = learningReducer(failed, { type: "resource-error", at: 2_000 });
  assert.deepEqual(afterFailure.attempts["en-failed"].result, {
    outcome: "resource-error",
    contentId: "en-failed",
  });
  assert.equal(afterFailure.attempts["en-failed"].grade, null);
  assert.equal(learningSessionStats(afterFailure).resourceErrors, 1);
});

test("T16: caregiver assistance is recorded but never counted as independent success", () => {
  const target = entry("en-assisted");
  let session = single(target, many);
  session = learningReducer(session, {
    type: "support",
    at: 2_000,
    support: "assisted",
  });
  session = learningReducer(session, {
    type: "answer",
    at: 2_100,
    optionId: correctOption(session),
  });
  const attempt = session.attempts[target.id];
  assert.equal(attempt.result.outcome, "answered");
  assert.equal(attempt.result.outcome === "answered" && attempt.result.support, "assisted");
  assert.equal(attempt.counted, false);
  assert.equal(attempt.grade, null);
  assert.equal(learningSessionStats(session).independent, 0);
  assert.equal(learningSessionStats(session).supported, 1);
});

test("T17: foreground time can end the session while background time is ignored", () => {
  const target = entry("en-timed");
  const policy = withPolicyOverrides(PRIMARY_STARTER_POLICY, {
    reviewLimit: 1,
    newContentLimit: 0,
    timeLimitMs: 10_000,
  });
  let session = single(target, many, policy);
  session = learningReducer(session, {
    type: "answer",
    at: 2_000,
    optionId: correctOption(session),
  });
  session = learningReducer(session, {
    type: "tick",
    at: 7_000,
    visible: true,
  });
  assert.equal(session.activeMs, 6_000);
  // The page was still foreground until the hidden event arrives at 10_000,
  // so that interval counts; the 20s background gap does not.
  session = learningReducer(session, {
    type: "tick",
    at: 10_000,
    visible: false,
  });
  assert.equal(session.activeMs, 9_000);
  session = learningReducer(session, {
    type: "tick",
    at: 30_000,
    visible: true,
  });
  assert.equal(session.activeMs, 9_000);
  session = learningReducer(session, {
    type: "tick",
    at: 31_000,
    visible: true,
  });
  assert.equal(session.activeMs, 10_000);
  assert.equal(session.endReason, "time-limit");
  assert.equal(session.attempts[target.id].grade, Rating.Good);
  assert.equal(learningSessionStats(session).independent, 1);
});

test("T17: background time does not inflate the next answer's active duration", () => {
  const target = entry("en-background");
  let session = single(target, many);
  session = learningReducer(session, {
    type: "tick",
    at: 2_000,
    visible: false,
  });
  session = learningReducer(session, {
    type: "tick",
    at: 60_000,
    visible: true,
  });
  session = learningReducer(session, {
    type: "tick",
    at: 61_000,
    visible: true,
  });
  session = learningReducer(session, {
    type: "answer",
    at: 62_000,
    optionId: correctOption(session),
  });
  assert.equal(session.attempts[target.id].elapsedMs, 3_000);
  assert.equal(session.activeMs, 3_000);
});

test("T17: stopping mid-session keeps completed learning", () => {
  const target = entry("en-stop");
  let session = single(target, many);
  session = learningReducer(session, {
    type: "answer",
    at: 2_000,
    optionId: correctOption(session),
  });
  session = learningReducer(session, { type: "stop", at: 2_500 });
  assert.equal(session.endReason, "user-stopped");
  assert.equal(session.attempts[target.id].grade, Rating.Good);
  assert.equal(learningSessionStats(session).independent, 1);
});

test("T17: an overdue review backlog ends normally after the cap", () => {
  const policy = withPolicyOverrides(PRIMARY_STARTER_POLICY, {
    reviewLimit: 8,
    newContentLimit: 0,
  });
  let session = createLearningSession({
    courseId: "primary-starter",
    contentVersion: "test-v1",
    policy,
    pool: many,
    due: many.slice(0, 20),
    fresh: [],
    now: 1_000,
    seed: 3,
  });
  assert.equal(session.steps.length, 8);
  for (let i = 0; i < 8; i++) {
    session = learningReducer(session, { type: "skip", at: 2_000 + i });
  }
  assert.equal(session.endReason, "completed");
  assert.equal(learningSessionStats(session).skipped, 8);
});

test("session results separate first independent, hinted and assisted correct answers", () => {
  for (const support of ["independent", "hinted", "assisted"] as const) {
    let session = single(many[0], many);
    if (support !== "independent") session = learningReducer(session, { type: "support", support, at: 1100 });
    session = learningReducer(session, { type: "answer", optionId: correctOption(session), at: 1200 });
    const stats = learningSessionStats(session);
    assert.equal(stats.independent, support === "independent" ? 1 : 0);
    assert.equal(stats.hinted, support === "hinted" ? 1 : 0);
    assert.equal(stats.assisted, support === "assisted" ? 1 : 0);
  }
  let wrong = single(many[0], many);
  wrong = learningReducer(wrong, { type: "support", support: "hinted", at: 1100 });
  wrong = learningReducer(wrong, { type: "answer", optionId: wrongOption(wrong), at: 1200 });
  assert.equal(learningSessionStats(wrong).hinted, 0, "a hinted wrong answer is not presented as a success");
});
