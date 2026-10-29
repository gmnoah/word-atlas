import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { SampleCourse } from "../src/courses/types";

const hash = (content: string | Uint8Array) => createHash("sha256").update(content).digest("hex");
const safe = (value: string) => /^[a-z0-9][a-z0-9._-]{0,79}$/i.test(value) && value !== "." && value !== "..";
const mediaPath = (value: string) => /^[a-z0-9_/-]+\.(?:webp|png|jpg|mp3|wav|ogg)$/i.test(value) && !value.startsWith("/") && !value.split("/").includes("..");

/** An archive is immutable: same course/version cannot silently change text or media. */
export function archiveCourse(course: SampleCourse, root: string, write: boolean) {
  const { id, version } = course.manifest;
  if (!safe(id) || !safe(version)) throw new Error("Invalid course archive identity");
  const publicRoot = path.resolve(root, "public");
  const archive = path.join(publicRoot, "courses", id, version);
  const paths = [...new Set(course.entries.flatMap((entry) => [entry.media.image, entry.media.recording, entry.media.exampleRecording].filter((value): value is string => !!value)))].sort();
  const assets = paths.map((relative) => {
    if (!mediaPath(relative)) throw new Error(`Invalid media path: ${relative}`);
    const source = fs.readFileSync(path.join(publicRoot, relative));
    return { relative, source, digest: hash(source) };
  });
  const index = JSON.stringify({ schemaVersion: 1, courseId: id, version, contentSha256: hash(JSON.stringify(course)),
    media: assets.map(({ relative, digest }) => ({ path: relative, sha256: digest })) }, null, 2) + "\n";
  const outputs = [...assets.map(({ relative, source }) => ({ target: path.join(archive, "media", relative), value: source })),
    { target: path.join(archive, "course.json"), value: Buffer.from(JSON.stringify(course, null, 2) + "\n") },
    { target: path.join(archive, "archive.json"), value: Buffer.from(index) }];
  // Preflight the whole archive before writing anything.
  for (const { target, value } of outputs) {
    if (fs.existsSync(target)) {
      if (hash(fs.readFileSync(target)) !== hash(value)) throw new Error(`Version archive conflict: ${id}@${version}; create a new version`);
    } else if (!write) throw new Error(`Missing version archive: ${id}@${version}; run npm run archive:courses`);
  }
  if (write) for (const { target, value } of outputs) {
    if (!fs.existsSync(target)) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value, { flag: "wx" }); }
  }
  return { courseId: id, version, files: assets.length };
}
