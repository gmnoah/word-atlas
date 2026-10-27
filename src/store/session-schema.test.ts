import assert from "node:assert/strict";
import { test } from "node:test";
import type { Atlas, WordRef } from "../atlas/types";
import { defaultSettings, emptyProgress, type ActiveSession, type Progress } from "./store";
import type { CardState } from "./srs";
import { sanitizeProgress } from "./store";
import { sanitizeActiveSession } from "./session-schema";
import { reconcileSession, buildSession } from "./session";

const card: CardState = { due: 1, s: 2, d: 5, el: 0, sd: 1, ls: 0, reps: 1, lapses: 0, st: 2, seen: 1 };

const steps: ActiveSession["steps"] = [
  { id: "alpha", kind: "intro" },
  { id: "alpha", kind: "meaning", options: ["alpha", "beta"] },
  { id: "beta", kind: "listen", retry: true, options: ["beta", "alpha"] },
  { id: "beta", kind: "spell" },
];

const validSession: ActiveSession = {
  id: "s1",
  started: 1_000,
  steps,
  index: 1,
  graded: { alpha: 3 },
  newIds: ["alpha", "beta"],
  reviewIds: [],
  contentVersion: "v1",
  pending: { correct: true, value: "alpha" },
};

test("T19: a well-formed legacy session keeps options, retries and pending state", () => {
  const session = sanitizeActiveSession(validSession);
  assert.ok(session);
  assert.equal(session.index, 1);
  assert.equal(session.contentVersion, "v1");
  assert.deepEqual(
    JSON.parse(JSON.stringify(session.steps)),
    JSON.parse(JSON.stringify(steps)),
  );
  assert.deepEqual(session.pending, { correct: true, value: "alpha" });
  const progress = sanitizeProgress(
    { ...emptyProgress("word-atlas-open"), cards: { alpha: card }, session: validSession },
    "word-atlas-open",
  );
  assert.equal(progress.session?.contentVersion, "v1");
  assert.equal(progress.session?.pending?.correct, true);
  assert.equal(progress.cards.alpha.s, 2);
});

test("T15/T19: broken option lists and impossible indices drop only the session", () => {  const broken: unknown[] = [
    { ...validSession, steps: [{ id: "alpha", kind: "meaning", options: ["alpha"] }] },
    { ...validSession, steps: [{ id: "alpha", kind: "meaning", options: ["alpha", "alpha"] }] },
    { ...validSession, steps: [{ id: "alpha", kind: "meaning", options: ["beta", "gamma"] }] },
    { ...validSession, index: 9 },
    { ...validSession, steps: [{ id: "alpha", kind: "spell", options: ["alpha", "beta"] }] },
    { ...validSession, started: -1 },
  ];
  for (const raw of broken) {
    const progress = sanitizeProgress(
      { ...emptyProgress("word-atlas-open"), cards: { alpha: card }, session: raw },
      "word-atlas-open",
    );
    assert.equal(progress.session, null);
    assert.equal(progress.cards.alpha.s, 2);
  }
});

test("T19: references outside the session are removed from grades and id lists", () => {
  const progress = sanitizeProgress(
    {
      ...emptyProgress("word-atlas-open"),
      session: {
        ...validSession,
        graded: { alpha: 3, ghost: 4 },
        newIds: ["alpha", "ghost", "beta"],
        reviewIds: ["ghost"],
      },
    },
    "word-atlas-open",
  );
  assert.ok(progress.session);
  assert.deepEqual(progress.session.graded, { alpha: 3 });
  assert.deepEqual(progress.session.newIds, ["alpha", "beta"]);
  assert.deepEqual(progress.session.reviewIds, []);
});

test("T19: an oversized pending value is discarded without losing the session", () => {
  const progress = sanitizeProgress(
    {
      ...emptyProgress("word-atlas-open"),
      session: { ...validSession, pending: { correct: true, value: "x".repeat(201) } },
    },
    "word-atlas-open",
  );
  assert.ok(progress.session);
  assert.equal(progress.session.pending, undefined);
});

const words: WordRef[] = [
  { id: "alpha", word: "alpha", zh: "阿尔法", ipa: "", cefr: 1, topic: 0, media: 7, order: 0 },
  { id: "beta", word: "beta", zh: "贝塔", ipa: "", cefr: 1, topic: 0, media: 7, order: 1 },
  { id: "gamma", word: "gamma", zh: "伽马", ipa: "", cefr: 1, topic: 0, media: 1, order: 2 },
];

const atlas: Atlas = {
  id: "word-atlas-open",
  name: "test",
  kind: "open",
  count: words.length,
  examples: 0,
  illustrated: words.length,
  topics: [],
  cefr: ["A1"],
  words,
  byId: new Map(words.map((word) => [word.id, word])),
  entry: async () => {
    throw new Error("not used");
  },
  peek: () => undefined,
  img: () => null,
  audio: () => null,
  manifest: {
    id: "word-atlas-open",
    version: "v2",
    title: "test",
    subject: "english",
    stage: "ielts",
    status: "available",
    description: "",
    attribution: "",
  },
  toLearningEntry: () => {
    throw new Error("not used");
  },
  asLearningEntry: async () => {
    throw new Error("not used");
  },
};

function progressWith(session: ActiveSession): Progress {
  return {
    ...emptyProgress("word-atlas-open"),
    cards: { alpha: card, beta: card },
    session,
  };
}

test("T19: reconciliation rebuilds stale future questions and keeps first-attempt history", () => {
  const stale: ActiveSession = {
    ...validSession,
    contentVersion: "v0",
    index: 0,
    steps: [
      { id: "alpha", kind: "meaning", options: ["alpha", "beta"] },
      { id: "beta", kind: "listen", options: ["beta", "alpha"] },
    ],
    graded: { alpha: 3 },
    pending: undefined,
  };
  const result = reconcileSession(
    atlas,
    stale,
    progressWith(stale),
    { ...defaultSettings, spell: false },
  );
  assert.ok(result);
  assert.equal(result.contentVersion, "v2");
  assert.equal(result.graded.alpha, 3);
  assert.equal(result.index, 0);
  assert.ok(result.steps.every((step) => step.id === "alpha" || step.id === "beta"));
  for (const step of result.steps) {
    if (step.kind === "intro" || step.kind === "spell") continue;
    assert.ok(step.options && step.options.length >= 2);
  }
});

test("T19: reconciliation drops vanished words and shifts the saved index", () => {
  const session: ActiveSession = {
    ...validSession,
    steps: [
      { id: "gone", kind: "meaning", options: ["gone", "alpha"] },
      { id: "alpha", kind: "meaning", options: ["alpha", "beta"] },
      { id: "beta", kind: "spell" },
    ],
    index: 1,
    graded: { gone: 3, alpha: 4 },
    pending: undefined,
  };
  const result = reconcileSession(
    atlas,
    session,
    progressWith(session),
    { ...defaultSettings, spell: false },
  );
  assert.ok(result);
  assert.ok(result.steps.every((step) => step.id !== "gone"));
  assert.equal(result.index, 0);
  assert.deepEqual(result.graded, { alpha: 4 });
  assert.equal(result.contentVersion, "v2");
});

test("T19: reconciliation rebuilds an unavailable media format", () => {
  const session: ActiveSession = {
    ...validSession,
    steps: [{ id: "gamma", kind: "listen", options: ["gamma", "alpha"] }],
    index: 0,
    graded: {},
    pending: undefined,
  };
  const result = reconcileSession(
    atlas,
    session,
    progressWith(session),
    { ...defaultSettings, spell: false },
  );
  assert.ok(result);
  assert.notEqual(result.steps[0].kind, "listen");
  assert.equal(result.contentVersion, "v2");
});

test("T15: the legacy builder omits words that cannot form two options", () => {
  const only = words[0];
  const tiny: Atlas = {
    ...atlas,
    words: [only],
    byId: new Map([[only.id, only]]),
    count: 1,
  };
  const review = buildSession(
    tiny,
    { ...emptyProgress("word-atlas-open"), cards: { [only.id]: card } },
    { ...defaultSettings, dailyNew: 1, spell: false },
  );
  assert.equal(review.steps.length, 0);
  assert.deepEqual(review.reviewIds, []);
  const fresh = buildSession(tiny, emptyProgress("word-atlas-open"), {
    ...defaultSettings,
    dailyNew: 1,
    spell: false,
  });
  assert.equal(fresh.steps.length, 0);
  assert.deepEqual(fresh.newIds, []);
});

test("T19: a content upgrade keeps the meet-then-recall order", () => {
  const session: ActiveSession = {
    ...validSession,
    contentVersion: "v0",
    index: 0,
    steps: [
      { id: "alpha", kind: "intro" },
      { id: "alpha", kind: "meaning", options: ["alpha", "beta"] },
      { id: "beta", kind: "intro" },
      { id: "beta", kind: "spell" },
    ],
    graded: {},
    pending: undefined,
  };
  const result = reconcileSession(
    atlas,
    session,
    progressWith(session),
    { ...defaultSettings, spell: false },
  );
  assert.ok(result);
  assert.deepEqual(
    result.steps.map((step) => step.kind === "intro"),
    [true, false, true, false],
  );
  assert.equal(result.steps[0].id, "alpha");
  assert.equal(result.steps[2].id, "beta");
});

test("T19: a removed word drops both its intro and its question", () => {
  const session: ActiveSession = {
    ...validSession,
    contentVersion: "v0",
    index: 0,
    steps: [
      { id: "gone", kind: "intro" },
      { id: "alpha", kind: "intro" },
      { id: "gone", kind: "meaning", options: ["gone", "alpha"] },
      { id: "alpha", kind: "meaning", options: ["alpha", "beta"] },
    ],
    graded: {},
    pending: undefined,
  };
  const result = reconcileSession(
    atlas,
    session,
    progressWith(session),
    { ...defaultSettings, spell: false },
  );
  assert.ok(result);
  assert.deepEqual(result.steps.map((step) => step.id), ["alpha", "alpha"]);
  assert.deepEqual(result.steps.map((step) => step.kind === "intro"), [true, false]);
});

test("T19: a rebuilt current step drops the stale pending answer", () => {
  const session: ActiveSession = {
    ...validSession,
    contentVersion: "v0",
    index: 0,
    steps: [
      { id: "alpha", kind: "meaning", options: ["alpha", "beta"] },
      { id: "beta", kind: "meaning", options: ["beta", "alpha"] },
    ],
    graded: {},
    pending: { correct: true, value: "alpha" },
  };
  const result = reconcileSession(
    atlas,
    session,
    progressWith(session),
    { ...defaultSettings, spell: false },
  );
  assert.ok(result);
  assert.equal(result.pending, undefined);
  assert.notEqual(result, session);
});

test("T19: a session with no usable step is discarded instead of resuming empty", () => {
  const session: ActiveSession = {
    ...validSession,
    steps: [{ id: "gone", kind: "spell" }],
    index: 0,
  };
  assert.equal(
    reconcileSession(atlas, session, progressWith(session), defaultSettings),
    null,
  );
});
