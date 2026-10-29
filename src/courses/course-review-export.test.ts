import assert from "node:assert/strict";
import { test } from "node:test";
import { reviewCsv, reviewRows } from "../../scripts/course-review-export";
import { sampleCourses } from "./samples";

test("review exports cover active courses and leave human decisions blank", () => {
  for (const course of sampleCourses) {
    const rows = reviewRows(course, process.cwd());
    assert.equal(rows.length, course.entries.length + 1);
    assert.deepEqual(rows.slice(1).map((row) => row[3]), course.entries.map((entry) => entry.id));
    for (const row of rows.slice(1)) {
      assert.equal(row[1], course.manifest.version);
      assert.ok(row[10].startsWith(`public/courses/${course.manifest.id}/${course.manifest.version}/media/`));
      assert.ok(row.slice(16).every((cell) => cell === ""));
    }
  }
});

test("CSV quoting preserves content while preventing spreadsheet formula execution", () => {
  assert.equal(reviewCsv([["正常", "a,b", 'say "yes"', "=SUM(1,1)", "+1"]]),
    '\ufeff"正常","a,b","say ""yes""","\'=SUM(1,1)","\'+1"\r\n');
});
