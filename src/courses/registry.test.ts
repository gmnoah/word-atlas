import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { courseAction, courseRegistry, findCourse } from "./registry";
import { sampleCourses } from "./samples";

test("registry maps the legacy dataset to the unchanged IELTS route and count", () => {
  const legacy = findCourse("word-atlas-open");
  assert.equal(legacy?.kind, "legacy");
  assert.deepEqual(courseAction("word-atlas-open"), {
    kind: "legacy",
    href: "#/",
  });
  const index = JSON.parse(readFileSync("public/atlas/index.json", "utf8"));
  assert.equal(legacy?.kind === "legacy" && legacy.count, index.count);
});
test("every preview resolves to its pack and shares the registered manifest", () => {
  assert.equal(
    new Set(courseRegistry.map((c) => c.manifest.id)).size,
    courseRegistry.length,
  );
  for (const course of courseRegistry.filter((c) => c.kind === "preview")) {
    assert.equal(
      sampleCourses.find((c) => c.manifest.id === course.manifest.id)?.manifest,
      course.manifest,
    );
    assert.deepEqual(courseAction(course.manifest.id), {
      kind: "preview",
      courseId: course.manifest.id,
    });
  }
});
test("planned and unknown courses never return a playable course action", () => {
  for (const id of ["middle-english", "high-english"])
    assert.deepEqual(courseAction(id), {
      kind: "unavailable",
      reason: "planned",
    });
  for (const id of ["", "missing", "__proto__"])
    assert.deepEqual(courseAction(id), {
      kind: "unavailable",
      reason: "unknown",
    });
});
