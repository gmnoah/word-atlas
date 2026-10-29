import assert from "node:assert/strict";
import { test } from "node:test";
import { createDraftPrompt, courseProductionManifest } from "./content-production";
import { sampleCourses } from "./samples";

test("draft prompts enforce distinct age and language requirements without inventing media", () => {
  const english = createDraftPrompt("primary-english", ["apple"]);
  const hanzi = createDraftPrompt("preschool-hanzi", ["山"]);
  assert.match(english, /targetForm/);
  assert.match(english, /en-GB/);
  assert.match(hanzi, /zh-CN/);
  assert.match(hanzi, /不要求拼音或打字/);
  for (const prompt of [english, hanzi]) {
    assert.match(prompt, /"reviewStatus":"draft"/);
    assert.match(prompt, /"recording":null/);
    assert.match(prompt, /"source":""/);
  }
  assert.throws(() => createDraftPrompt("primary-english", []));
});

test("build inventory preserves source, review status and exact content references", () => {
  for (const course of sampleCourses) {
    const manifest = courseProductionManifest(course);
    assert.equal(manifest.entries.length, course.entries.length);
    assert.deepEqual(manifest.lessons.flatMap((lesson) => lesson.entryIds), course.lessons.flatMap((lesson) => lesson.entryIds));
    assert.deepEqual(manifest.entries.map((entry) => entry.media.source), course.entries.map((entry) => entry.media.source));
    for (const entry of manifest.entries) if (entry.media.image)
      assert.equal(entry.media.archived.image, `courses/${course.manifest.id}/${course.manifest.version}/media/${entry.media.image}`);
    assert.ok(manifest.entries.every((entry) => entry.reviewStatus === "draft"));
    assert.deepEqual(courseProductionManifest(course), manifest);
  }
});
