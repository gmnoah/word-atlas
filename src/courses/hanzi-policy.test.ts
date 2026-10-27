import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleCourses } from "./samples";
import { hanziPolicy } from "./hanzi-policy";
import { hasMandarinVoice, watchMandarinVoice } from "./hanzi-voice";
import { buildQuestion } from "../learning/questions";
import { createLearningSession, currentStep, learningReducer, learningSessionStats } from "../learning/session";

const hanzi = sampleCourses[1].entries.filter((entry) => entry.kind === "hanzi");

test("T25: Hanzi listening uses Mandarin and degrades without a voice", () => {
  const withVoice = hanziPolicy({ voiceAvailable: true });
  assert.ok(withVoice.allowedKinds.includes("hanzi-listen"));
  assert.ok(!withVoice.allowedKinds.some((kind) => kind === "listen" || kind === "spell"));
  const withoutVoice = hanziPolicy({ voiceAvailable: false });
  assert.ok(!withoutVoice.allowedKinds.includes("hanzi-listen"));
  assert.ok(withoutVoice.allowedKinds.includes("hanzi-question"));
  assert.equal(withoutVoice.subject, "hanzi");

  const plan = buildQuestion(hanzi[0], hanzi, withVoice, 1);
  assert.ok(plan);
  assert.equal(plan.options.includes(hanzi[0].id), true);
  assert.ok(plan.options.length >= 2);
  // Draft characters have no recordings; a device voice still makes listening valid.
  assert.equal(hanzi[0].media.recording, null);
});

test("T25: no Hanzi question ever borrows the English word fields", () => {
  const policy = hanziPolicy({ voiceAvailable: true });
  for (const entry of hanzi) {
    const plan = buildQuestion(entry, hanzi, policy, 7);
    assert.ok(plan, entry.id);
    assert.ok(["hanzi-question", "hanzi-picture", "hanzi-listen"].includes(plan.kind), entry.id);
  }
});

test("T26: co-reading introduces characters and never grades a recall", () => {
  const policy = hanziPolicy({ voiceAvailable: false, coReading: true, entryCount: 3 });
  const session = createLearningSession({
    courseId: "hanzi-starter",
    contentVersion: "draft",
    policy,
    pool: hanzi,
    due: [],
    fresh: hanzi,
    requestedNewCount: 3,
    introOnly: true,
    now: 1_000,
    seed: 3,
  });
  assert.equal(session.timeLimitMs, null);
  assert.equal(session.steps.length, 3);
  assert.ok(session.steps.every((step) => step.kind === "intro"));
  let cursor = session;
  while (!cursor.endedAt) cursor = learningReducer(cursor, { type: "next", at: 2_000 });
  const stats = learningSessionStats(cursor);
  assert.equal(stats.introduced, 3);
  assert.equal(stats.independent, 0);
  assert.equal(Object.keys(cursor.attempts).length, 0);
});

test("T26: a Hanzi lesson asks for the character and ignores answer speed", () => {
  const policy = hanziPolicy({ voiceAvailable: false, timeLimitMinutes: 30 });
  let session = createLearningSession({
    courseId: "hanzi-starter",
    contentVersion: "draft",
    policy,
    pool: hanzi,
    due: [hanzi[0]],
    fresh: [],
    now: 1_000,
    seed: 5,
  });
  const step = currentStep(session);
  assert.ok(step && step.kind !== "intro");
  session = learningReducer(session, { type: "answer", at: 900_000, optionId: step.contentId });
  const attempt = session.attempts[hanzi[0].id];
  assert.equal(attempt.result.outcome === "answered" && attempt.result.correct, true);
  assert.equal(attempt.grade, 3);
});

test("T27: caregiver assistance never counts as independent recognition", () => {
  const policy = hanziPolicy({ voiceAvailable: false });
  let session = createLearningSession({
    courseId: "hanzi-starter",
    contentVersion: "draft",
    policy,
    pool: hanzi,
    due: [hanzi[1]],
    fresh: [],
    now: 1_000,
    seed: 6,
  });
  const step = currentStep(session);
  assert.ok(step && step.kind !== "intro");
  session = learningReducer(session, { type: "support", at: 1_100, support: "assisted" });
  session = learningReducer(session, { type: "answer", at: 1_200, optionId: step.contentId });
  const stats = learningSessionStats(session);
  assert.equal(stats.independent, 0);
  assert.equal(stats.supported, 1);
  assert.equal(session.attempts[hanzi[1].id].grade, null);
});

test("T25: Mandarin voice detection is honest about missing or late voices", () => {
  const noVoice = { getVoices: () => [] };
  assert.equal(hasMandarinVoice({ speechSynthesis: noVoice as unknown as SpeechSynthesis }), false);
  const englishOnly = {
    getVoices: () => [{ lang: "en-GB" }, { lang: "en-US" }],
  };
  assert.equal(hasMandarinVoice({ speechSynthesis: englishOnly as unknown as SpeechSynthesis }), false);
  let voices = [{ lang: "en-GB" }];
  const listeners = new Set<() => void>();
  const synth = {
    getVoices: () => voices,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  } as unknown as SpeechSynthesis;
  const seen: boolean[] = [];
  const stop = watchMandarinVoice({ speechSynthesis: synth }, (value) => seen.push(value));
  voices = [...voices, { lang: "zh-CN" }] as typeof voices;
  listeners.forEach((listener) => listener());
  assert.deepEqual(seen, [false, true]);
  stop();
  assert.equal(listeners.size, 0);
});
