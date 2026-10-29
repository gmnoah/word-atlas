import { auditCourse, type CourseAudit } from "./audit";
import type { SampleCourse } from "./types";

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.length <= 2000;
const id = (value: unknown): value is string => text(value) && /^[a-z0-9_-]{1,120}$/i.test(value) && !["__proto__", "constructor", "prototype"].includes(value.toLowerCase());
const nullableText = (value: unknown) => value === null || text(value);

/** Validate untrusted JSON before the typed audit touches any nested field. */
export function validateCourseInput(raw: unknown, mediaExists: (path: string) => boolean, expectedVersion?: string): CourseAudit {
  const errors: CourseAudit["errors"] = [];
  const fail = (code: string, message: string, entryId?: string) => errors.push({ courseId: "input", code, message, entryId });
  if (!object(raw) || !object(raw.manifest) || !Array.isArray(raw.lessons) || !Array.isArray(raw.entries)) {
    fail("invalid-course", "课程必须包含 manifest、lessons 和 entries");
    return { errors, releaseBlockers: [], entries: 0 };
  }
  const manifest = raw.manifest;
  if (!id(manifest.id) || !text(manifest.version) || !/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(manifest.version) ||
      !text(manifest.title) || !manifest.title.trim() || !text(manifest.description) || !text(manifest.attribution) || !manifest.attribution.trim() ||
      typeof manifest.status !== "string" || !["available", "preview", "planned"].includes(manifest.status) ||
      !((manifest.subject === "english" && typeof manifest.stage === "string" && ["ielts", "primary", "middle", "high"].includes(manifest.stage)) || (manifest.subject === "hanzi" && manifest.stage === "preschool")))
    fail("invalid-manifest", "课程身份、版本、学科或阶段无效");
  if (expectedVersion !== undefined && manifest.version !== expectedVersion) fail("version-mismatch", "内容版本与预期版本不一致");
  if (raw.entries.length > 10_000 || raw.lessons.length > 1000) {
    fail("too-large", "课程条目或小课数量超过上限");
    return { errors, releaseBlockers: [], entries: raw.entries.length };
  }
  if (raw.topics !== undefined && (!Array.isArray(raw.topics) || raw.topics.length > 1000 ||
      !raw.topics.every((topic) => object(topic) && id(topic.id) && text(topic.title) && !!topic.title.trim())))
    fail("invalid-topics", "主题目录格式无效");
  for (const lesson of raw.lessons) {
    if (!object(lesson) || !id(lesson.id) || !text(lesson.title) || !lesson.title.trim() || !text(lesson.subtitle) || !Array.isArray(lesson.entryIds) || !lesson.entryIds.every(id))
      fail("invalid-lesson", "小课字段或条目引用格式无效");
  }
  for (const entry of raw.entries) {
    if (!object(entry)) { fail("invalid-entry", "条目必须是对象"); continue; }
    const entryId = id(entry.id) ? entry.id : undefined;
    const media = entry.media;
    if (!entryId || !id(entry.topicId) || !text(entry.caregiverTip) || !entry.caregiverTip.trim() || typeof entry.reviewStatus !== "string" || !["draft", "approved", "legacy-unreviewed"].includes(entry.reviewStatus) ||
        !object(media) || !nullableText(media.image) || !nullableText(media.recording) || !(media.exampleRecording === undefined || nullableText(media.exampleRecording)) ||
        !text(media.locale) || !text(media.source)) {
      fail("invalid-entry", "条目身份、媒体或审校字段无效", entryId); continue;
    }
    if (entry.humanReview !== undefined && (!object(entry.humanReview) || !text(entry.humanReview.reviewer) || !text(entry.humanReview.reviewedAt) ||
        typeof entry.humanReview.text !== "boolean" || typeof entry.humanReview.image !== "boolean" || typeof entry.humanReview.audio !== "boolean"))
      fail("invalid-review", "人工审校记录字段无效", entryId);
    if (entry.kind === "english") {
      if (!text(entry.word) || !entry.word.trim() || !text(entry.meaning) || !entry.meaning.trim() || !object(entry.example) || !text(entry.example.text) || !entry.example.text.trim() || !text(entry.example.translation) || !entry.example.translation.trim() ||
          !(entry.example.targetForm === undefined || text(entry.example.targetForm))) fail("invalid-english", "英语条目字段无效", entryId);
    } else if (entry.kind === "hanzi") {
      if (![entry.character, entry.pinyin, entry.phrase, entry.sentence, entry.question].every((value) => text(value) && !!value.trim()) ||
          (text(entry.character) && text(entry.phrase) && !entry.phrase.includes(entry.character))) fail("invalid-hanzi", "汉字条目字段无效", entryId);
    } else fail("invalid-kind", "条目学科无效", entryId);
  }
  if (errors.length) return { errors, releaseBlockers: [], entries: raw.entries.length };
  const course = raw as unknown as SampleCourse;
  const report = auditCourse(course, mediaExists);
  const topics = course.topics?.map((topic) => topic.id) ?? course.lessons.map((lesson) => lesson.id);
  const topicSet = new Set(topics);
  if (topics.length !== topicSet.size) report.errors.push({ courseId: course.manifest.id, code: "duplicate-topic", message: "主题 ID 重复" });
  for (const entry of course.entries) if (!topicSet.has(entry.topicId))
    report.errors.push({ courseId: course.manifest.id, entryId: entry.id, code: "unknown-topic", message: "条目引用不存在的主题" });
  const byId = new Map(course.entries.map((entry) => [entry.id, entry]));
  for (const lesson of course.lessons) {
    const seen = new Set<string>();
    const images = new Set<string>();
    for (const entryId of lesson.entryIds) {
      const entry = byId.get(entryId);
      if (!entry) continue;
      const label = (entry.kind === "english" ? entry.word : entry.character).trim().toLocaleLowerCase("en");
      if (seen.has(label)) report.errors.push({ courseId: course.manifest.id, entryId, code: "duplicate-answer", message: "同一小课存在相同答案" });
      seen.add(label);
      if (entry.media.image && images.has(entry.media.image)) report.errors.push({ courseId: course.manifest.id, entryId, code: "duplicate-image-answer", message: "同一小课存在重复图片选项" });
      if (entry.media.image) images.add(entry.media.image);
    }
  }
  return report;
}
