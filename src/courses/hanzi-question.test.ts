import assert from "node:assert/strict";
import { test } from "node:test";
import { hanziFull } from "./hanzi-full";
import { hanziQuestionPrompt, isHanziMatchingQuestion } from "./hanzi-question";
import type { HanziEntry } from "./types";

test("draft lessons ask for the target's position instead of an ambiguous blank", () => {
  for (const entry of hanziFull.entries) {
    if (entry.kind !== "hanzi" || !entry.topicId.startsWith("draft-hanzi-")) continue;
    const text = hanziQuestionPrompt(entry, entry.topicId);
    assert.ok(text.includes(`“${entry.phrase}”`), entry.id);
    assert.match(text, /找第.+个字。$/);
    assert.ok(!text.includes("□"));
  }
  const red = hanziFull.entries.find((entry) => entry.kind === "hanzi" && entry.character === "红") as HanziEntry;
  assert.equal(hanziQuestionPrompt(red, red.topicId), "在“红色”里，找第一个字。");
  const sample = hanziFull.entries[0] as HanziEntry;
  assert.equal(hanziQuestionPrompt(sample, sample.topicId), sample.question);
});


test("only phrase-position questions are treated as visual matching", () => {
  assert.equal(isHanziMatchingQuestion("draft-hanzi-14", "hanzi-question"), true);
  assert.equal(isHanziMatchingQuestion("draft-hanzi-14", "hanzi-listen"), false);
  assert.equal(isHanziMatchingQuestion("nature", "hanzi-question"), false);
});

test("visual matching is kept for resume but does not create recognition progress", async () => {
  const { hanziPolicy } = await import("./hanzi-policy");
  const { createLearningSession, currentStep, learningReducer, learningSessionStats } = await import("../learning/session");
  const { applyPrimarySession, emptyPrimaryProgress } = await import("../learning/primary-progress");
  const { hanziRecognitionSession } = await import("./hanzi-question");
  const lesson = hanziFull.lessons.find((item) => item.id === "draft-hanzi-14")!;
  const entries = hanziFull.entries.filter((item) => lesson.entryIds.includes(item.id));
  const policy = hanziPolicy({ voiceAvailable: false, disablePicture: true });
  let session = createLearningSession({ courseId: "hanzi-starter", contentVersion: "test", policy,
    pool: entries, due: [entries[0]], fresh: [], now: 1000, seed: 1 });
  const step = currentStep(session)!;
  assert.equal(step.kind, "hanzi-question");
  session = learningReducer(session, { type: "answer", optionId: step.contentId, at: 1200 });
  assert.ok(session.attempts[step.contentId], "the original attempt remains available to resume");
  const evidence = hanziRecognitionSession(session, lesson.id);
  assert.equal(learningSessionStats(evidence).independent, 0);
  const progress = applyPrimarySession(emptyPrimaryProgress("child-a", "hanzi-starter"), evidence);
  assert.equal(progress.cards[step.contentId], undefined);
  assert.equal(hanziRecognitionSession(session, "nature").attempts[step.contentId], session.attempts[step.contentId]);
});
