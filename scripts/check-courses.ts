/** Draft structure check by default; --release also enforces media and human review. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sampleCourses } from "../src/courses/samples.ts";
import { courseRegistry } from "../src/courses/registry.ts";
import { validateCourseInput } from "../src/courses/validate-input.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = process.argv.includes("--release");
const inputIndex = process.argv.indexOf("--input");
if (inputIndex !== -1) {
  try {
    const inputFile = process.argv[inputIndex + 1];
    if (!inputFile || inputFile.startsWith("--")) throw new Error("请提供课程 JSON 文件路径");
    const versionIndex = process.argv.indexOf("--expected-version");
    const expectedVersion = versionIndex === -1 ? undefined : process.argv[versionIndex + 1];
    if (versionIndex !== -1 && (!expectedVersion || expectedVersion.startsWith("--"))) throw new Error("请提供预期版本");
    const raw: unknown = JSON.parse(fs.readFileSync(inputFile, "utf8"));
    const report = validateCourseInput(raw, (relative) => fs.existsSync(path.join(root, "public", relative)), expectedVersion);
    console.log(JSON.stringify({ mode: release ? "release" : "preview", ...report }, null, 2));
    process.exitCode = report.errors.length || (release && report.releaseBlockers.length) ? 1 : 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "课程文件无法读取");
    process.exitCode = 1;
  }
} else {
const reports = sampleCourses.map((course) => ({
  courseId: course.manifest.id,
  ...validateCourseInput(course, (relative) =>
    fs.existsSync(path.join(root, "public", relative)),
    courseRegistry.find((registered) => registered.manifest.id === course.manifest.id)?.manifest.version,
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
}
