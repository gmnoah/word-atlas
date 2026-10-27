import assert from "node:assert/strict";
import { test } from "node:test";
import { auditCourse } from "./audit";
import { sampleCourses } from "./samples";

const copy = () => structuredClone(sampleCourses[1]);
test("drafts remain previewable but cannot pass the release gate", () => {
  const report = auditCourse(copy(), () => true);
  assert.equal(report.errors.length, 0);
  assert.equal(
    report.releaseBlockers.filter((i) => i.code === "missing-recording").length,
    20,
  );
  assert.equal(
    report.releaseBlockers.filter((i) => i.code === "unreviewed").length,
    20,
  );
});
test("declared missing files and unsafe paths fail even preview validation", () => {
  const course = copy();
  course.entries[0].media.image = "../private/image.webp";
  course.entries[1].media.recording = "missing.mp3";
  const report = auditCourse(course, (path) => path !== "missing.mp3");
  assert.equal(
    report.errors.filter((i) => i.code === "invalid-media").length,
    2,
  );
});
test("release approval requires an auditable human review, not only an approved flag", () => {
  const course = copy();
  for (const entry of course.entries) {
    entry.reviewStatus = "approved";
    entry.media.recording = "test/word.mp3";
    entry.media.exampleRecording = "test/sentence.mp3";
  }
  assert.equal(auditCourse(course, () => true).releaseBlockers.length, 20);
  // Synthetic evidence only inside a test fixture, never written to real content.
  for (const entry of course.entries)
    entry.humanReview = {
      reviewer: "fixture reviewer",
      reviewedAt: "2026-10-27",
      text: true,
      image: true,
      audio: true,
    };
  assert.equal(auditCourse(course, () => true).releaseBlockers.length, 0);
});
test("bad references, duplicate IDs, missing text and wrong language are detected", () => {
  const course = copy();
  course.entries[1].id = course.entries[0].id;
  course.entries[0].media.locale = "en-GB";
  course.entries[0].caregiverTip = "";
  course.lessons[0].entryIds.push("missing");
  const codes = new Set(
    auditCourse(course, () => true).errors.map((i) => i.code),
  );
  for (const code of [
    "duplicate-id",
    "wrong-locale",
    "missing-text",
    "unknown-reference",
  ])
    assert.ok(codes.has(code), code);
});

test("primary examples require one explicitly declared whole-word form", () => {
  const course = structuredClone(sampleCourses[0]);
  assert.equal(auditCourse(course, () => true).errors.length, 0);
  const entry = course.entries[0];
  if (entry.kind !== "english") throw new Error("Expected an English entry");
  for (const targetForm of [undefined, "apple", "banana"]) {
    entry.example.targetForm = targetForm;
    assert.ok(auditCourse(course, () => true).errors.some((issue) => issue.code === "invalid-example-target"));
  }
  entry.example.targetForm = "apples";
  entry.example.text = "I like apples and apples.";
  assert.ok(auditCourse(course, () => true).errors.some((issue) => issue.code === "invalid-example-target"));
});
