import assert from "node:assert/strict";
import { test } from "node:test";
import type { EnglishEntry } from "../courses/types";
import { HANZI_PARENT_POLICY, PRIMARY_STARTER_POLICY } from "./policy";
import { sampleCourses } from "../courses/samples";
import {
  createLearningSession,
  currentStep,
  learningReducer,
  learningSessionStats,
  type LearningSession,
} from "./session";
import { restoreLearningSession, type RestoreContext } from "./persistence";

function entry(id: string): EnglishEntry {
  return {
    kind: "english",
    id,
    topicId: "test",
    word: id.replace(/-/g, ""),
    meaning: `意思-${id}`,
    example: { text: `This is ${id}.`, translation: `这是${id}。` },
    media: {
      image: `atlas/img/${id}.webp`,
      recording: `atlas/audio/uk/${id}.mp3`,
      locale: "en-GB",
      source: "test fixture",
    },
    reviewStatus: "draft",
    caregiverTip: "",
  };
}

const entries = Array.from({ length: 12 }, (_, index) => entry(`en-word-${index}`));

test("restoring a saved listening question removes an ambiguous homophone option", () => {
  const pool = sampleCourses[1].entries.filter((entry) => entry.kind === "hanzi" && ["鹦", "鹰", "鸽"].includes(entry.character));
  const target = pool.find((entry) => entry.kind === "hanzi" && entry.character === "鹦")!;
  const homophone = pool.find((entry) => entry.kind === "hanzi" && entry.character === "鹰")!;
  const session = createLearningSession({ courseId: "hanzi-starter", contentVersion: "test-v1", policy: HANZI_PARENT_POLICY,
    pool, due: [target], fresh: [], now: 1000, seed: 1 });
  session.steps[0] = { contentId: target.id, kind: "hanzi-listen", options: [target.id, homophone.id] };
  const restored = restoreLearningSession(JSON.parse(JSON.stringify(session)), { courseId: "hanzi-starter", contentVersion: "test-v1", policy: HANZI_PARENT_POLICY, entries: pool, now: 2000 });
  assert.equal(restored.status, "repaired");
  assert.ok(restored.session);
  const step = currentStep(restored.session);
  assert.ok(step && (step.kind !== "hanzi-listen" || !step.options?.includes(homophone.id)));
});
test("saved Hanzi picture questions validate the characters actually displayed", () => {
  const source = sampleCourses[1].entries.filter((entry) => entry.kind === "hanzi");
  const target = source.find((entry) => entry.kind === "hanzi" && entry.character === "山")!;
  const other = source.find((entry) => entry.kind === "hanzi" && entry.character === "水")!;
  const duplicate = { ...target, id: "hanzi-duplicate", media: { ...target.media, image: "atlas/img/other.webp" } };
  const pool = [target, other, duplicate];
  const session = createLearningSession({ courseId: "hanzi-starter", contentVersion: "test-v1", policy: HANZI_PARENT_POLICY,
    pool, due: [target], fresh: [], now: 1000, seed: 1 });
  session.steps[0] = { contentId: target.id, kind: "hanzi-picture", options: [target.id, duplicate.id] };
  const context = { courseId: "hanzi-starter", contentVersion: "test-v1", policy: HANZI_PARENT_POLICY, entries: pool, now: 2000 };
  const repaired = restoreLearningSession(JSON.parse(JSON.stringify(session)), context);
  assert.equal(repaired.status, "repaired");
  assert.ok(repaired.session);
  const step = currentStep(repaired.session);
  assert.ok(step && (step.kind !== "hanzi-picture" || !step.options?.includes(duplicate.id)));
  session.steps[0] = { contentId: target.id, kind: "hanzi-picture", options: [target.id, other.id] };
  const restored = restoreLearningSession(JSON.parse(JSON.stringify(session)), context);
  assert.ok(restored.session);
  assert.deepEqual(currentStep(restored.session)?.options, [target.id, other.id]);
});

const context: RestoreContext = {
  courseId: "primary-starter",
  contentVersion: "test-v1",
  policy: PRIMARY_STARTER_POLICY,
  entries,
  now: 10_000,
};

function answeredSession(): LearningSession {
  let session = createLearningSession({
    courseId: context.courseId,
    contentVersion: context.contentVersion,
    policy: PRIMARY_STARTER_POLICY,
    pool: entries,
    due: [entries[0]],
    fresh: [],
    now: 1_000,
    seed: 42,
  });
  const step = currentStep(session);
  assert.ok(step?.options);
  session = learningReducer(session, {
    type: "answer",
    at: 2_000,
    optionId: step.contentId,
  });
  return session;
}

function roundTrip(session: LearningSession): unknown {
  return JSON.parse(JSON.stringify(session));
}

test("T19: malformed option containers and prototype names are repaired without throwing", () => {
  for (const options of [{}, "bad-options", [null, entries[0].id], 42]) {
    const raw = JSON.parse(JSON.stringify(answeredSession()));
    raw.steps[0].options = options;
    const restored = restoreLearningSession(raw, context);
    assert.equal(restored.status, "repaired");
    assert.ok(restored.session);
    assert.ok(Array.isArray(restored.session.steps[0].options));
  }
  const raw = JSON.parse(JSON.stringify(answeredSession()));
  raw.steps[0].kind = "constructor";
  const restored = restoreLearningSession(raw, context);
  assert.equal(restored.status, "repaired");
  assert.ok(restored.session);
  assert.notEqual(restored.session.steps[0].kind, "constructor");
});

test("T19: valid mixed-case text options survive restore without rebuilding", () => {
  const capitalized = entries.map((item) => ({ ...item, word: item.word.toUpperCase() }));
  const policy = { ...PRIMARY_STARTER_POLICY, allowedKinds: ["listen-word"] as const };
  const session = createLearningSession({
    courseId: context.courseId, contentVersion: context.contentVersion,
    policy, pool: capitalized,
    due: capitalized.slice(0, 1), fresh: [], now: 1_000, seed: 42,
  });
  const restored = restoreLearningSession(roundTrip(session), { ...context, policy, entries: capitalized });
  assert.equal(restored.status, "ok");
  assert.deepEqual(restored.session?.steps, JSON.parse(JSON.stringify(session.steps)));
});

test("T19: retry plans cannot switch the target or restore more than two retries", () => {
  const raw = JSON.parse(JSON.stringify(answeredSession()));
  const original = raw.steps[0];
  const other = createLearningSession({
    courseId: context.courseId, contentVersion: context.contentVersion,
    policy: PRIMARY_STARTER_POLICY, pool: entries,
    due: [entries[1]], fresh: [], now: 1_000, seed: 42,
  }).steps[0];
  raw.retryPlans[entries[0].id] = [{ ...other, retry: true }];
  raw.steps.push(...Array.from({ length: 5 }, () => ({ ...original, retry: true })));
  const restored = restoreLearningSession(raw, context);
  assert.ok(restored.session);
  assert.equal(restored.status, "repaired");
  assert.equal(restored.session.steps.filter((step) => step.retry).length, 2);
  assert.ok(restored.session.retryPlans[entries[0].id].every((step) => step.contentId === entries[0].id));
});

test("T19: assisted answers and restored practice never acquire memory grades", () => {
  const raw = JSON.parse(JSON.stringify(answeredSession()));
  raw.attempts[entries[0].id].result.support = "assisted";
  raw.practice = [JSON.parse(JSON.stringify(raw.attempts[entries[0].id]))];
  const restored = restoreLearningSession(raw, context);
  assert.ok(restored.session);
  assert.equal(restored.session.attempts[entries[0].id].counted, false);
  assert.equal(restored.session.attempts[entries[0].id].grade, null);
  assert.equal(restored.session.practice[0].first, false);
  assert.equal(restored.session.practice[0].counted, false);
  assert.equal(restored.session.practice[0].grade, null);
});

test("T19: a valid session survives a JSON round-trip", () => {
  const session = answeredSession();
  const restored = restoreLearningSession(roundTrip(session), context);
  assert.equal(restored.status, "ok");
  assert.ok(restored.session);
  assert.equal(restored.session.index, session.index);
  assert.equal(restored.session.attempts[entries[0].id].grade, session.attempts[entries[0].id].grade);
  assert.equal(currentStep(restored.session)?.kind, currentStep(session)?.kind);
  assert.deepEqual(currentStep(restored.session)?.options, currentStep(session)?.options);
  assert.deepEqual(learningSessionStats(restored.session), learningSessionStats(session));
  assert.equal(restored.preservedAttempts.length, 1);
});

test("T19: a session from another content version is rejected but keeps attempt history", () => {
  const raw = roundTrip(answeredSession()) as Record<string, unknown>;
  raw.contentVersion = "test-v0";
  const restored = restoreLearningSession(raw, context);
  assert.equal(restored.status, "rejected");
  assert.equal(restored.session, null);
  assert.equal(restored.reason, "content-version");
  assert.equal(restored.preservedAttempts.length, 1);
  assert.equal(restored.preservedAttempts[0].contentId, entries[0].id);
});

test("T19: an unknown course or policy is rejected instead of mixing content", () => {
  const raw = roundTrip(answeredSession()) as Record<string, unknown>;
  assert.equal(
    restoreLearningSession({ ...raw, courseId: "ielts" }, context).reason,
    "course-mismatch",
  );
  assert.equal(
    restoreLearningSession({ ...raw, policyId: "primary-advanced" }, context).reason,
    "policy-mismatch",
  );
  assert.equal(restoreLearningSession({}, context).reason, "session-version");
});

test("T19: a damaged question is rebuilt while completed attempts stay intact", () => {
  const raw = roundTrip(answeredSession()) as Record<string, unknown> & {
    steps: Array<Record<string, unknown>>;
    index: number;
    attempts: Record<string, unknown>;
  };
  raw.steps[0].options = [entries[0].id];
  raw.index = 0;
  const restored = restoreLearningSession(raw, context);
  assert.equal(restored.status, "repaired");
  assert.ok(restored.session);
  assert.deepEqual(restored.session.attempts, JSON.parse(JSON.stringify(raw.attempts)));
  const step = currentStep(restored.session);
  assert.ok(step);
  assert.ok(step.options && step.options.length >= 2);
  assert.ok(step.options.includes(entries[0].id));
});

test("T19: an out-of-range index resumes at the end instead of inventing steps", () => {
  const raw = roundTrip(answeredSession()) as Record<string, unknown>;
  raw.index = 99;
  const restored = restoreLearningSession(raw, context);
  assert.equal(restored.status, "repaired");
  assert.ok(restored.session);
  assert.equal(restored.session.index, restored.session.steps.length);
  assert.equal(restored.session.endReason, "completed");
  assert.equal(restored.session.endedAt, context.now);
});

test("T19: steps whose content disappeared are dropped and the index follows", () => {
  const session = createLearningSession({
    courseId: context.courseId,
    contentVersion: context.contentVersion,
    policy: PRIMARY_STARTER_POLICY,
    pool: entries,
    due: [entries[0], entries[1]],
    fresh: [],
    now: 1_000,
    seed: 7,
  });
  assert.equal(session.steps.length, 2);
  const raw = roundTrip(session) as Record<string, unknown>;
  const contextWithoutFirst: RestoreContext = {
    ...context,
    entries: entries.slice(1),
  };
  const restored = restoreLearningSession(raw, contextWithoutFirst);
  assert.ok(restored.session);
  assert.equal(restored.status, "repaired");
  assert.ok(restored.session.steps.every((step) => step.contentId !== entries[0].id));
  assert.equal(restored.session.steps.length, 1);
  assert.equal(restored.session.index, 0);
  assert.equal(currentStep(restored.session)?.contentId, entries[1].id);
});

test("T19: a user-stopped session stays ended after restore", () => {
  const raw = roundTrip(answeredSession()) as Record<string, unknown>;
  raw.index = 0;
  raw.endedAt = 5_000;
  raw.endReason = "user-stopped";
  const restored = restoreLearningSession(raw, context);
  assert.equal(restored.status, "ok");
  assert.ok(restored.session);
  assert.equal(restored.session.index, 0);
  assert.equal(restored.session.endedAt, 5_000);
  assert.equal(restored.session.endReason, "user-stopped");
});

test("T19: half an end marker or a contradictory completion is repaired", () => {
  const onlyAt = roundTrip(answeredSession()) as Record<string, unknown>;
  onlyAt.index = 0;
  onlyAt.endedAt = 5_000;
  const clearedAt = restoreLearningSession(onlyAt, context);
  assert.equal(clearedAt.status, "repaired");
  assert.ok(clearedAt.session);
  assert.equal(clearedAt.session.endedAt, undefined);
  assert.equal(clearedAt.session.endReason, undefined);

  const contradictory = roundTrip(answeredSession()) as Record<string, unknown>;
  contradictory.index = 0;
  contradictory.endedAt = 5_000;
  contradictory.endReason = "completed";
  const cleared = restoreLearningSession(contradictory, context);
  assert.equal(cleared.status, "repaired");
  assert.ok(cleared.session);
  assert.equal(cleared.session.endedAt, undefined);
  assert.equal(cleared.session.endReason, undefined);
});

test("T19: an intro skipped before refresh never becomes a graded recall", () => {
  let session = createLearningSession({
    courseId: context.courseId,
    contentVersion: context.contentVersion,
    policy: PRIMARY_STARTER_POLICY,
    pool: entries,
    due: [],
    fresh: entries.slice(0, 2),
    now: 1_000,
    seed: 11,
  });
  assert.equal(currentStep(session)?.kind, "intro");
  session = learningReducer(session, { type: "skip", at: 2_000 });
  const skippedId = session.steps[0].contentId;

  const restored = restoreLearningSession(roundTrip(session), context);
  assert.equal(restored.status, "ok");
  assert.ok(restored.session);
  assert.equal(restored.session.attempts[skippedId].result.outcome, "skipped");
  assert.equal(restored.session.attempts[skippedId].kind, "intro");

  let resumed = restored.session;
  for (let guard = 0; guard < 8 && !resumed.endedAt; guard++) {
    const step = currentStep(resumed);
    if (!step) break;
    if (step.kind === "intro") {
      resumed = learningReducer(resumed, { type: "next", at: 3_000 + guard });
      continue;
    }
    assert.notEqual(
      step.contentId,
      skippedId,
      "a skipped intro must not come back as a question",
    );
    resumed = learningReducer(resumed, {
      type: "answer",
      at: 3_000 + guard,
      optionId: step.contentId,
    });
    resumed = learningReducer(resumed, { type: "next", at: 3_100 + guard });
  }
  assert.ok(resumed.endedAt);
  assert.equal(resumed.attempts[skippedId].result.outcome, "skipped");
});

test("T19: reopening resets the activity baseline instead of counting offline time", () => {
  const raw = roundTrip(answeredSession()) as Record<string, unknown>;
  raw.lastTickAt = 1_000;
  raw.visible = true;
  const reopenedAt = 3_600_000;
  const restored = restoreLearningSession(raw, { ...context, now: reopenedAt });
  assert.ok(restored.session);
  assert.equal(restored.session.lastTickAt, reopenedAt);
  const activeBefore = restored.session.activeMs;
  const ticked = learningReducer(restored.session, {
    type: "tick",
    at: reopenedAt + 500,
    visible: true,
  });
  assert.equal(ticked.activeMs, activeBefore + 500);
  assert.equal(ticked.endReason, undefined);
});

test("T19: a restored session over its foreground limit ends immediately", () => {
  const raw = roundTrip(answeredSession()) as Record<string, unknown>;
  raw.activeMs = PRIMARY_STARTER_POLICY.timeLimitMs;
  const restored = restoreLearningSession(raw, context);
  assert.equal(restored.status, "repaired");
  assert.ok(restored.session);
  assert.equal(restored.session.endReason, "time-limit");
  assert.equal(restored.session.endedAt, context.now);
});

test("T19: an intro step can never be restored as a retry or with options", () => {
  const raw = roundTrip(answeredSession()) as Record<string, unknown>;
  const retriedIntro = {
    contentId: entries[0].id,
    kind: "intro",
    retry: true,
    options: [entries[0].id, entries[1].id],
  };
  raw.steps = [retriedIntro];
  raw.index = 0;
  const restored = restoreLearningSession(raw, context);
  assert.ok(restored.session);
  assert.equal(restored.session.steps[0].kind, "intro");
  assert.equal("retry" in restored.session.steps[0], false);
  assert.equal(restored.session.steps[0].options, undefined);
});

test("T19: malformed attempts and retry plans cannot escape their bounds", () => {
  const session = answeredSession();
  let retried = session;
  const step = currentStep(retried);
  assert.ok(step?.options);
  const wrong = step.options.find((id) => id !== step.contentId);
  assert.ok(wrong);
  retried = learningReducer(retried, { type: "answer", at: 2_100, optionId: wrong });
  const raw = roundTrip(retried) as Record<string, unknown> & {
    attempts: Record<string, unknown>;
    retryPlans: Record<string, unknown[]>;
    retryCursor: Record<string, number>;
  };
  raw.attempts.bad = { contentId: entries[0].id };
  raw.attempts.intro = {
    ...JSON.parse(JSON.stringify(raw.attempts[entries[0].id])),
    kind: "intro",
  };
  raw.attempts.mismatch = {
    ...JSON.parse(JSON.stringify(raw.attempts[entries[0].id])),
    contentId: entries[1].id,
  };
  raw.attempts[entries[1].id] = JSON.parse(
    JSON.stringify(raw.attempts[entries[0].id]),
  );
  raw.retryPlans[entries[0].id] = new Array(20).fill(null);
  raw.retryCursor[entries[0].id] = 99;

  const restored = restoreLearningSession(JSON.parse(JSON.stringify(raw)), context);
  assert.ok(restored.session);
  assert.equal(Object.keys(restored.session.attempts).length, 1);
  assert.ok(restored.session.retryPlans[entries[0].id].length <= 2);
  assert.ok(
    restored.session.retryCursor[entries[0].id] <=
      restored.session.retryPlans[entries[0].id].length,
  );
});
