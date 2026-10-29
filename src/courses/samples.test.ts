import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { sampleCourses } from "./samples";
import { entryLabel } from "./types";
import { primarySample } from "./primary-sample";
import { hanziSample } from "./hanzi-sample";

test("expanded courses retain the original entries and lessons unchanged", () => {
  for (const [full, original] of [[sampleCourses[0], primarySample], [sampleCourses[1], hanziSample]]) {
    assert.deepEqual(full.lessons.slice(0, original.lessons.length), original.lessons);
    assert.deepEqual(full.entries.slice(0, original.entries.length), original.entries);
  }
});

test("the 150-character expansion preserves the archived 100-character course", () => {
  const previous = JSON.parse(readFileSync("public/courses/hanzi-starter/0.2.0-draft/course.json", "utf8"));
  assert.deepEqual(sampleCourses[1].lessons.slice(0, 12), previous.lessons);
  const expanded = JSON.parse(readFileSync("public/courses/hanzi-starter/0.3.0-draft/course.json", "utf8"));
  assert.deepEqual(expanded.entries.slice(0, 100), previous.entries);
  for (const entry of sampleCourses[1].entries.slice(100)) {
    assert.equal(entry.kind, "hanzi");
    if (entry.kind === "hanzi") assert.ok(entry.sentence.includes(entry.character), entry.id);
  }
});

test("the 300-character expansion preserves the archived 150-character course", () => {
  const previous = JSON.parse(readFileSync("public/courses/hanzi-starter/0.3.0-draft/course.json", "utf8"));
  assert.deepEqual(sampleCourses[1].lessons.slice(0, 17), previous.lessons);
  const expanded = JSON.parse(readFileSync("public/courses/hanzi-starter/0.4.0-draft/course.json", "utf8"));
  assert.deepEqual(expanded.entries.slice(0, 150), previous.entries);
});

test("corrected 头发 uses fà while the previous archive stays unchanged", () => {
  const previous = JSON.parse(readFileSync("public/courses/hanzi-starter/0.4.0-draft/course.json", "utf8"));
  const old = previous.entries.find((entry: { character?: string }) => entry.character === "发");
  const current = sampleCourses[1].entries.find((entry) => entry.kind === "hanzi" && entry.character === "发");
  assert.equal(old.pinyin, "fā");
  assert.equal(current?.kind === "hanzi" && current.pinyin, "fà");
  assert.equal(current?.kind === "hanzi" && current.phrase, "头发");
});

test("course packs have 300 English words and 300 Hanzi, each in exactly one lesson", () => {
  assert.deepEqual(
    sampleCourses.map((c) => c.entries.length),
    [300, 300],
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
      assert.ok(entry.media.source.trim());
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

test("sample vocabulary revisions preserve other entries and the prior archive", () => {
  const previous = JSON.parse(readFileSync("public/courses/hanzi-starter/0.6.0-draft/course.json", "utf8"));
  const current = sampleCourses[1];
  const revised = new Set(["hanzi-u6c34", "hanzi-u8db3", "hanzi-u76ee"]);
  for (const entry of current.entries) {
    const old = previous.entries.find((item: { id: string }) => item.id === entry.id);
    assert.ok(old, entry.id);
    if (!revised.has(entry.id)) assert.deepEqual(entry, old, entry.id);
    else {
      assert.equal(entry.kind, "hanzi");
      if (entry.kind !== "hanzi") continue;
      assert.ok(entry.phrase.includes(entry.character), entry.id);
      assert.equal(entry.reviewStatus, "draft");
      assert.deepEqual(entry.media, old.media);
    }
  }
  assert.equal(previous.entries.find((item: { id: string }) => item.id === "hanzi-u8db3").phrase, "双足");
  assert.equal((current.entries.find((item) => item.id === "hanzi-u8db3") as { phrase: string }).phrase, "足迹");
});

test("English sample keeps the previous archive while correcting the cat's example", () => {
  const previous = JSON.parse(readFileSync("public/courses/primary-starter/0.2.0-draft/course.json", "utf8"));
  const current = JSON.parse(readFileSync("public/courses/primary-starter/0.3.0-draft/course.json", "utf8"));
  for (const entry of current.entries) {
    const old = previous.entries.find((item: { id: string }) => item.id === entry.id);
    assert.ok(old, entry.id);
    if (entry.id !== "en-cat") assert.deepEqual(entry, old, entry.id);
    else {
      assert.equal(entry.kind, "english");
      if (entry.kind !== "english") continue;
      assert.equal(old.example.text, "The cat is sleeping.");
      assert.equal(entry.example.text, "The cat is resting.");
      assert.deepEqual(entry.media, old.media);
      assert.equal(entry.reviewStatus, "draft");
    }
  }
});


test("sample picture-context edits preserve other English entries and old archives", () => {
  const previous = JSON.parse(readFileSync("public/courses/primary-starter/0.3.0-draft/course.json", "utf8"));
  const revised = new Set(["en-pear", "en-grape", "en-dog", "en-fish"]);
  for (const entry of sampleCourses[0].entries) {
    const old = previous.entries.find((item: { id: string }) => item.id === entry.id);
    assert.ok(old, entry.id);
    if (!revised.has(entry.id)) assert.deepEqual(entry, old, entry.id);
    else { assert.deepEqual(entry.media, old.media); assert.equal(entry.reviewStatus, "draft"); }
  }
  const grapes = sampleCourses[0].entries.find((item) => item.id === "en-grape");
  assert.equal(grapes?.kind === "english" && grapes.example.targetForm, "grapes");
});
