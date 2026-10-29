import { sampleCourses } from "../src/courses/samples.ts";
import { archiveCourse } from "./course-archive-lib.ts";

try {
  const result = sampleCourses.map((course) => archiveCourse(course, process.cwd(), true));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Archive failed");
  process.exitCode = 1;
}
