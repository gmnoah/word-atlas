import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HANZI_PARENT_POLICY,
  IELTS_POLICY,
  PRIMARY_ADVANCED_POLICY,
  PRIMARY_STARTER_POLICY,
  ieltsPolicyFromSettings,
  policyForCourse,
} from "./policy";

test("T13/T14: every stage has an explicit, bounded policy", () => {
  assert.equal(PRIMARY_STARTER_POLICY.newContentLimit, 3);
  assert.equal(PRIMARY_STARTER_POLICY.reviewLimit, 8);
  assert.equal(PRIMARY_STARTER_POLICY.introGroupSize, 2);
  assert.equal(PRIMARY_STARTER_POLICY.timingAffectsGrade, false);
  assert.deepEqual(PRIMARY_STARTER_POLICY.allowedKinds, [
    "listen-picture",
    "picture-word",
    "listen-word",
  ]);
  assert.equal(PRIMARY_ADVANCED_POLICY.newContentLimit, 5);
  assert.equal(HANZI_PARENT_POLICY.reviewLimit, 4);
  assert.equal(HANZI_PARENT_POLICY.subject, "hanzi");
  assert.equal(PRIMARY_STARTER_POLICY.showCountdown, false);
});

test("T14: IELTS keeps its legacy caps, spelling switch and speed grading", () => {
  const withSpell = ieltsPolicyFromSettings({ dailyNew: 12, spell: true });
  const withoutSpell = ieltsPolicyFromSettings({ dailyNew: 7, spell: false });
  assert.equal(withSpell.newContentLimit, 12);
  assert.equal(withSpell.reviewLimit, IELTS_POLICY.reviewLimit);
  assert.ok(withSpell.allowedKinds.includes("spell"));
  assert.ok(!withoutSpell.allowedKinds.includes("spell"));
  assert.equal(withSpell.timingAffectsGrade, true);
});

test("T14: a course identity maps to the child or IELTS strategy", () => {
  assert.equal(
    policyForCourse({ id: "hanzi-starter", subject: "hanzi", stage: "preschool" }).id,
    "hanzi-parent",
  );
  assert.equal(
    policyForCourse({ id: "primary-starter", subject: "english", stage: "primary" }).id,
    "primary-starter",
  );
  assert.equal(
    policyForCourse({ id: "primary-advanced", subject: "english", stage: "primary" }).id,
    "primary-advanced",
  );
  assert.equal(
    policyForCourse({ id: "word-atlas-open", subject: "english", stage: "ielts" }).id,
    "ielts",
  );
});
