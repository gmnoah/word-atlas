import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { sampleCourses } from "./samples";
import { entryLabel } from "./types";

test("sample packs have 30 English words and 20 Hanzi, each in exactly one lesson", () => {
  assert.deepEqual(
    sampleCourses.map((c) => c.entries.length),
    [30, 20],
  );
  for (const course of sampleCourses) {
    assert.equal(course.manifest.status, "preview");
    assert.equal(
      new Set(course.entries.map((e) => e.id)).size,
      course.entries.length,
    );
    const references = course.lessons.flatMap((l) => l.entryIds).sort();
    assert.deepEqual(references, course.entries.map((e) => e.id).sort());
    assert.equal(
      new Set(course.lessons.map((l) => l.id)).size,
      course.lessons.length,
    );
    for (const entry of course.entries) {
      assert.equal(entry.kind, course.manifest.subject);
      assert.ok(entryLabel(entry).length);
      assert.equal(entry.reviewStatus, "draft");
      assert.ok(entry.caregiverTip);
      assert.ok(entry.media.source.includes("CC BY 4.0"));
      assert.ok(
        entry.media.image && existsSync(`public/${entry.media.image}`),
        entry.id,
      );
      if (entry.kind === "english") {
        assert.equal(entry.media.locale, "en-GB");
        assert.ok(
          entry.media.recording &&
            existsSync(`public/${entry.media.recording}`),
          entry.id,
        );
        assert.ok(
          entry.example.text && entry.example.translation && entry.meaning,
        );
      } else {
        assert.equal(entry.media.locale, "zh-CN");
        assert.equal(
          entry.media.recording,
          null,
          "do not claim device speech is a recording",
        );
        assert.equal([...entry.character].length, 1);
        assert.ok(entry.phrase.includes(entry.character));
        assert.ok(entry.sentence && entry.question && entry.pinyin);
      }
    }
  }
});
