import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPreviewSession,
  previewReducer,
  previewStats,
} from "./preview-session";
import { sampleCourses } from "./samples";

const entries = sampleCourses[0].entries.slice(0, 3);
function recall() {
  let session = createPreviewSession(entries, 2, 1);
  session = previewReducer(session, { type: "next" });
  return previewReducer(session, { type: "next" });
}

test("preview limits the lesson and introduces selected entries before recall", () => {
  const session = createPreviewSession(entries, 2, 1);
  assert.deepEqual(
    session.steps.map((s) => s.kind),
    ["intro", "intro", "recall", "recall"],
  );
  for (const step of session.steps.slice(2)) {
    assert.equal(new Set(step.options).size, 2);
    assert.ok(step.options.includes(step.entryId));
  }
});
test("a singleton or empty lesson never fabricates distractors", () => {
  assert.equal(createPreviewSession([], 3, 1).steps.length, 0);
  assert.deepEqual(
    createPreviewSession(entries.slice(0, 1), 3, 1).steps.map((s) => s.kind),
    ["intro"],
  );
});
test("first answer is immutable and cannot be changed by repeated clicks or later hints", () => {
  let session = recall();
  const step = session.steps[session.index];
  session = previewReducer(session, { type: "answer", optionId: step.entryId });
  const first = session;
  session = previewReducer(session, {
    type: "answer",
    optionId: step.options.find((id) => id !== step.entryId)!,
  });
  session = previewReducer(session, { type: "support", support: "assisted" });
  assert.equal(session, first);
  assert.equal(previewStats(session).independent, 1);
});
test("hints and caregiver assistance are not independent correct answers", () => {
  for (const support of ["hinted", "assisted"] as const) {
    let session = recall();
    session = previewReducer(session, { type: "support", support });
    session = previewReducer(session, {
      type: "answer",
      optionId: session.steps[session.index].entryId,
    });
    assert.equal(previewStats(session).independent, 0);
    assert.equal(previewStats(session).supported, 1);
  }
});
test("skipping an introduction omits that entry's recall without recording a wrong answer", () => {
  let session = createPreviewSession(entries, 2, 1);
  const skipped = session.steps[0].entryId;
  session = previewReducer(session, { type: "skip" });
  session = previewReducer(session, { type: "next" });
  while (session.steps[session.index]) {
    assert.notEqual(session.steps[session.index].entryId, skipped);
    session = previewReducer(session, { type: "skip" });
  }
  assert.equal(session.results[skipped].outcome, "skipped");
  assert.equal(previewStats(session).independent, 0);
});
test("failed image cannot score and user can leave the failed question", () => {
  let session = recall();
  session = previewReducer(session, { type: "resource-error" });
  const failed = session;
  session = previewReducer(session, {
    type: "answer",
    optionId: session.steps[session.index].entryId,
  });
  assert.equal(session, failed);
  assert.equal(Object.keys(session.results).length, 0);
  session = previewReducer(session, { type: "skip" });
  assert.ok(session.index > failed.index);
  assert.equal(session.resourceFailed, false);
});
test("unknown options and next before an answer do not advance recall", () => {
  const session = recall();
  assert.equal(
    previewReducer(session, { type: "answer", optionId: "invalid" }),
    session,
  );
  assert.equal(previewReducer(session, { type: "next" }), session);
});
test("a finished session ignores further input", () => {
  const session = createPreviewSession([], 2, 1);
  assert.equal(previewReducer(session, { type: "next" }), session);
});
