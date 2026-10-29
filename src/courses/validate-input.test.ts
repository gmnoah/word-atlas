import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleCourses } from "./samples";
import { validateCourseInput } from "./validate-input";

test("external course rejects malformed fields without throwing", () => {
  for (const raw of [null, [], { manifest: {}, entries: [null], lessons: [] }, { manifest: {}, entries: [{ media: null }], lessons: [null] }]) {
    assert.ok(validateCourseInput(raw, () => true).errors.length);
  }
});

test("external course checks version, references, duplicate answers and release blockers", () => {
  const course = structuredClone(sampleCourses[0]);
  const clean = validateCourseInput(course, () => true, course.manifest.version);
  assert.equal(clean.errors.length, 0);
  assert.ok(clean.releaseBlockers.some((issue) => issue.code === "unreviewed"));
  assert.ok(validateCourseInput(course, () => true, "other").errors.some((issue) => issue.code === "version-mismatch"));
  const first = course.entries[0], second = course.entries[1];
  if (first.kind !== "english" || second.kind !== "english") throw new Error("Expected English");
  second.word = first.word;
  second.media.image = first.media.image;
  course.lessons[0].entryIds.push("en-missing");
  first.topicId = "unknown-topic";
  const codes = new Set(validateCourseInput(course, () => true).errors.map((issue) => issue.code));
  assert.ok(codes.has("duplicate-answer"));
  assert.ok(codes.has("duplicate-image-answer"));
  assert.ok(codes.has("unknown-topic"));
  assert.ok(codes.has("unknown-reference"));
});

test("invalid media paths and forged review shapes fail safely", () => {
  const course = structuredClone(sampleCourses[1]);
  course.entries[0].media.image = "../secret.png";
  const errors = validateCourseInput(course, () => true).errors;
  assert.ok(errors.some((issue) => issue.code === "invalid-media"));
  const raw = structuredClone(course) as unknown as { entries: Array<{ humanReview: unknown }> };
  raw.entries[0].humanReview = { reviewer: 3 };
  assert.ok(validateCourseInput(raw, () => true).errors.some((issue) => issue.code === "invalid-review"));
});
