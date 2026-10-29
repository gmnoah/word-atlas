import fs from "node:fs";
import path from "node:path";
import { sampleCourses } from "../src/courses/samples";
import { archiveCourse } from "./course-archive-lib";
import { reviewCsv, reviewRows } from "./course-review-export";

const root = process.cwd();
const directory = path.join(root, "data/review");
const files = sampleCourses.map((course) => {
  // Ensure the exported snapshot matches the immutable course version actually served.
  archiveCourse(course, root, false);
  return { file: path.join(directory, `${course.manifest.id}-${course.manifest.version}.csv`),
    content: reviewCsv(reviewRows(course, root)), count: course.entries.length };
});
fs.mkdirSync(directory, { recursive: true });
for (const { file, content, count } of files) {
  try { fs.writeFileSync(file, content, { flag: "wx" }); console.log(`${path.relative(root, file)}：${count} 条，已创建`); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    console.log(`${path.relative(root, file)}：已存在，保留原有审校记录`);
  }
}
