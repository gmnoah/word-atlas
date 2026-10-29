import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { archiveCourse } from "../../scripts/course-archive-lib";
import { sampleCourses } from "./samples";

test("course version archive is idempotent and rejects changed content or media", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "word-atlas-archive-"));
  try {
    const course = structuredClone(sampleCourses[0]);
    course.entries = course.entries.slice(0, 1);
    course.lessons = [{ ...course.lessons[0], entryIds: [course.entries[0].id] }];
    const media = course.entries[0].media;
    for (const relative of [media.image, media.recording]) {
      assert.ok(relative);
      const target = path.join(root, "public", relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `fixture-${relative}`);
    }
    assert.throws(() => archiveCourse(course, root, false), /Missing version archive/);
    archiveCourse(course, root, true);
    assert.deepEqual(archiveCourse(course, root, true), archiveCourse(course, root, false));
    const frozenCourse = path.join(root, "public", "courses", course.manifest.id, course.manifest.version, "course.json");
    assert.deepEqual(JSON.parse(fs.readFileSync(frozenCourse, "utf8")), course);
    const archivePath = path.join(root, "public", "courses", course.manifest.id, course.manifest.version, "media", media.image!);
    const original = fs.readFileSync(archivePath);
    const changed = structuredClone(course);
    changed.entries[0].caregiverTip = "edited";
    assert.throws(() => archiveCourse(changed, root, true), /Version archive conflict/);
    fs.writeFileSync(path.join(root, "public", media.image!), "new content");
    assert.throws(() => archiveCourse(course, root, true), /Version archive conflict/);
    assert.deepEqual(fs.readFileSync(archivePath), original);
    changed.manifest.version = "fixture-next";
    archiveCourse(changed, root, true);
    assert.deepEqual(fs.readFileSync(archivePath), original);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
