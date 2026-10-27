import type { SampleCourse } from "./types";
import { exampleTargetParts } from "./example-target";

export interface AuditIssue {
  courseId: string;
  entryId?: string;
  code: string;
  message: string;
}
export interface CourseAudit {
  errors: AuditIssue[];
  releaseBlockers: AuditIssue[];
  entries: number;
}
const safePath = (path: string) =>
  /^[a-zA-Z0-9_/-]+\.(webp|png|jpg|mp3|wav|ogg)$/.test(path) &&
  !path.startsWith("/") &&
  !path.split("/").includes("..");

/** Static typed content audit. This is not a runtime parser or a teaching review. */
export function auditCourse(
  course: SampleCourse,
  mediaExists: (relativePath: string) => boolean,
): CourseAudit {
  const result: CourseAudit = {
    errors: [],
    releaseBlockers: [],
    entries: course.entries.length,
  };
  const issue = (
    code: string,
    message: string,
    entryId?: string,
  ): AuditIssue => ({ courseId: course.manifest.id, entryId, code, message });
  if (!course.entries.length || !course.lessons.length)
    result.errors.push(issue("empty-course", "课程或小课为空"));
  const ids = new Set<string>();
  const lessonIds = new Set<string>();
  const referenced = new Set<string>();
  for (const entry of course.entries) {
    if (!entry.id || ids.has(entry.id))
      result.errors.push(issue("duplicate-id", "条目 ID 缺失或重复", entry.id));
    ids.add(entry.id);
    if (entry.kind !== course.manifest.subject)
      result.errors.push(
        issue("wrong-subject", "条目类型与课程学科不一致", entry.id),
      );
    const textComplete =
      entry.kind === "english"
        ? entry.word &&
          entry.meaning &&
          entry.example.text &&
          entry.example.translation
        : [...entry.character].length === 1 &&
          entry.pinyin &&
          entry.phrase &&
          entry.sentence &&
          entry.question;
    if (!textComplete || !entry.caregiverTip)
      result.errors.push(issue("missing-text", "条目缺少必需文本", entry.id));
    if (course.manifest.stage === "primary" && entry.kind === "english" &&
        !exampleTargetParts(entry.example.text, entry.example.targetForm))
      result.errors.push(issue("invalid-example-target", "例句须明确标注且唯一包含目标词形", entry.id));
    if (entry.media.locale !== (entry.kind === "english" ? "en-GB" : "zh-CN"))
      result.errors.push(
        issue("wrong-locale", "朗读语言与学科不一致", entry.id),
      );
    if (!entry.media.source.trim())
      result.errors.push(issue("missing-source", "媒体缺少来源记录", entry.id));
    for (const [field, path] of Object.entries({
      image: entry.media.image,
      recording: entry.media.recording,
      exampleRecording: entry.media.exampleRecording,
    })) {
      if (!path)
        result.releaseBlockers.push(
          issue(
            `missing-${field}`,
            `缺少 ${field === "image" ? "插画" : field === "recording" ? "词 / 字录音" : "例句录音"}`,
            entry.id,
          ),
        );
      else if (!safePath(path) || !mediaExists(path))
        result.errors.push(
          issue("invalid-media", `${field} 路径不安全或文件不存在`, entry.id),
        );
    }
    if (entry.reviewStatus !== "approved")
      result.releaseBlockers.push(issue("unreviewed", "待人工审校", entry.id));
    else {
      const review = entry.humanReview;
      if (
        !review?.reviewer.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt) ||
        !Number.isFinite(Date.parse(review.reviewedAt)) ||
        !review.text ||
        !review.image ||
        !review.audio
      ) {
        result.releaseBlockers.push(
          issue(
            "incomplete-review",
            "缺少完整的文本、插画、音频人工审校记录",
            entry.id,
          ),
        );
      }
    }
  }
  for (const lesson of course.lessons) {
    if (!lesson.id || lessonIds.has(lesson.id))
      result.errors.push(issue("duplicate-lesson", "小课 ID 缺失或重复"));
    lessonIds.add(lesson.id);
    if (!lesson.entryIds.length)
      result.errors.push(issue("empty-lesson", "小课没有内容"));
    if (new Set(lesson.entryIds).size !== lesson.entryIds.length)
      result.errors.push(issue("duplicate-reference", "同一小课重复引用条目"));
    for (const id of lesson.entryIds) {
      referenced.add(id);
      if (!ids.has(id))
        result.errors.push(
          issue("unknown-reference", "小课引用不存在的条目", id),
        );
    }
  }
  for (const entry of course.entries)
    if (!referenced.has(entry.id))
      result.errors.push(
        issue("orphan-entry", "条目没有加入任何小课", entry.id),
      );
  return result;
}
