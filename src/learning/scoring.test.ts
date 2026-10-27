import assert from "node:assert/strict";
import { test } from "node:test";
import { Rating } from "../store/srs";
import {
  IELTS_POLICY,
  PRIMARY_STARTER_POLICY,
  HANZI_PARENT_POLICY,
} from "./policy";
import {
  gradeForPolicy,
  resourceErrorResult,
  scoreAttempt,
  skippedResult,
} from "./scoring";

test("T16: IELTS keeps its historic speed-sensitive grade boundaries", () => {
  assert.equal(gradeForPolicy("spell", true, 1_000, "independent", IELTS_POLICY), Rating.Easy);
  assert.equal(gradeForPolicy("spell", true, 10_000, "independent", IELTS_POLICY), Rating.Good);
  assert.equal(gradeForPolicy("spell", true, 21_000, "independent", IELTS_POLICY), Rating.Hard);
  assert.equal(gradeForPolicy("meaning", true, 10_000, "independent", IELTS_POLICY), Rating.Hard);
  assert.equal(gradeForPolicy("meaning", false, 1_000, "independent", IELTS_POLICY), Rating.Again);
});

test("T16: a child's slow independent answer is still Good", () => {
  const slow = scoreAttempt(
    {
      contentId: "en-apple",
      kind: "picture-word",
      correct: true,
      support: "independent",
      elapsedMs: 120_000,
      firstValid: true,
    },
    PRIMARY_STARTER_POLICY,
  );
  assert.equal(slow.grade, Rating.Good);
  assert.equal(slow.counted, true);
  assert.equal(slow.independent, true);
});

test("T16: hints, assistance, skips and resource failures stay distinct", () => {
  const hinted = scoreAttempt(
    {
      contentId: "hanzi-u5c71",
      kind: "hanzi-picture",
      correct: true,
      support: "hinted",
      elapsedMs: 1_000,
      firstValid: true,
    },
    HANZI_PARENT_POLICY,
  );
  assert.equal(hinted.grade, Rating.Hard);
  assert.equal(hinted.counted, true);
  assert.equal(hinted.independent, false);

  const assisted = scoreAttempt(
    {
      contentId: "hanzi-u5c71",
      kind: "hanzi-picture",
      correct: true,
      support: "assisted",
      elapsedMs: 1_000,
      firstValid: true,
    },
    HANZI_PARENT_POLICY,
  );
  assert.equal(assisted.grade, null);
  assert.equal(assisted.counted, false);
  assert.equal(assisted.independent, false);

  assert.deepEqual(skippedResult("x"), { outcome: "skipped", contentId: "x" });
  assert.deepEqual(resourceErrorResult("y"), {
    outcome: "resource-error",
    contentId: "y",
  });
});

test("T16: retries and repeated submissions cannot be counted twice", () => {
  const repeated = scoreAttempt(
    {
      contentId: "en-apple",
      kind: "listen-word",
      correct: true,
      support: "independent",
      elapsedMs: 500,
      firstValid: false,
    },
    PRIMARY_STARTER_POLICY,
  );
  assert.equal(repeated.grade, null);
  assert.equal(repeated.counted, false);
  assert.equal(repeated.independent, false);
});
