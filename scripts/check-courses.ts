/** Draft structure check by default; --release also enforces media and human review. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sampleCourses } from "../src/courses/samples.ts";
import { courseRegistry } from "../src/courses/registry.ts";
import { auditCourse } from "../src/courses/audit.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = process.argv.includes("--release");
const reports = sampleCourses.map((course) => ({
  courseId: course.manifest.id,
  ...auditCourse(course, (relative) =>
    fs.existsSync(path.join(root, "public", relative)),
  ),
}));
const registryErrors: string[] = [];
const ids = courseRegistry.map((c) => c.manifest.id);
if (ids.length !== new Set(ids).size) registryErrors.push("课程注册 ID 重复");
for (const course of courseRegistry) {
  if (!fs.existsSync(path.join(root, "public", course.cover)))
    registryErrors.push(`${course.manifest.id}: 封面缺失`);
  if (
    course.kind === "preview" &&
    !sampleCourses.some((pack) => pack.manifest.id === course.manifest.id)
  )
    registryErrors.push(`${course.manifest.id}: 缺少体验内容包`);
}
for (const pack of sampleCourses)
  if (!ids.includes(pack.manifest.id))
    registryErrors.push(`${pack.manifest.id}: 内容包未注册`);
const summary = {
  mode: release ? "release" : "preview",
  registeredCourses: ids.length,
  entries: reports.reduce((n, r) => n + r.entries, 0),
  structuralErrors:
    registryErrors.length + reports.reduce((n, r) => n + r.errors.length, 0),
  releaseBlockers: reports.reduce((n, r) => n + r.releaseBlockers.length, 0),
  registryErrors,
  courses: reports,
};
console.log(JSON.stringify(summary, null, 2));
process.exitCode =
  summary.structuralErrors || (release && summary.releaseBlockers) ? 1 : 0;
