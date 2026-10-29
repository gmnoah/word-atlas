import fs from "node:fs";
import path from "node:path";
import type { SampleCourse } from "../src/courses/types";
import { validateCourseInput } from "../src/courses/validate-input";

/** Read-only snapshot for human review; entries and approval state are never modified. */
export function reviewRows(course: SampleCourse, root: string): string[][] {
  const report = validateCourseInput(course, (relative) => fs.existsSync(path.join(root, "public", relative)), course.manifest.version);
  if (report.errors.length) throw new Error(`课程 ${course.manifest.id} 结构错误，无法导出`);
  const issues = new Map<string, string[]>();
  for (const issue of report.releaseBlockers) if (issue.entryId) {
    const list = issues.get(issue.entryId) ?? [];
    list.push(issue.message);
    issues.set(issue.entryId, list);
  }
  const lessons = new Map(course.lessons.map((lesson) => [lesson.id, lesson.title]));
  const archive = (file: string | null | undefined) => file ? `public/courses/${course.manifest.id}/${course.manifest.version}/media/${file}` : "";
  return [["课程", "课程版本", "主题", "条目ID", "内容", "拼音", "释义或词语", "例句", "例句译文", "家长提示", "图片", "字词录音", "例句录音", "图片及音频来源", "当前状态", "系统检查待处理", "文字审校", "图片审校", "发音审校", "审校人", "审校日期", "修改建议"],
    ...course.entries.map((entry) => [course.manifest.title, course.manifest.version, lessons.get(entry.topicId) ?? entry.topicId,
      entry.id, entry.kind === "english" ? entry.word : entry.character,
      entry.kind === "hanzi" ? entry.pinyin : "", entry.kind === "english" ? entry.meaning : entry.phrase,
      entry.kind === "english" ? entry.example.text : entry.sentence,
      entry.kind === "english" ? entry.example.translation : "", entry.caregiverTip,
      archive(entry.media.image), archive(entry.media.recording), archive(entry.media.exampleRecording), entry.media.source,
      entry.reviewStatus === "approved" ? "已审校" : "待审校", (issues.get(entry.id) ?? []).join("；"), "", "", "", "", "", ""]),
  ];
}

/** Protect spreadsheet readers from evaluating cells as formulas. */
export function reviewCsv(rows: string[][]): string {
  return "\ufeff" + rows.map((row) => row.map((cell) => {
    const safe = /^[\s\uFEFF]*[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n") + "\r\n";
}
