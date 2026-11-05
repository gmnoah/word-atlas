import assert from "node:assert/strict";
import test from "node:test";
import { validateCourseInput } from "./validate-input";
import { auditCourse } from "./audit";
import type { SampleCourse, EnglishEntry } from "./types";
import { sampleCourses } from "./samples";

const validBaseMedia = {
  image: "atlas/img/grade.webp",
  recording: "atlas/audio/uk/grade.mp3",
  exampleRecording: "atlas/audio/ex/grade.mp3",
  locale: "en-GB" as const,
  source: "Word Atlas contributors",
};

test("T61: valid middle English entry with partOfSpeech, collocation and contextQuestion passes validation", () => {
  const course: SampleCourse = {
    manifest: {
      id: "middle-test",
      version: "1.0.0-draft",
      title: "初中测试",
      subject: "english",
      stage: "middle",
      status: "preview",
      description: "测试课程",
      attribution: "词光",
    },
    lessons: [
      {
        id: "lesson-1",
        title: "测试单元",
        subtitle: "副标题",
        entryIds: ["mid-grade"],
      },
    ],
    entries: [
      {
        kind: "english",
        id: "mid-grade",
        topicId: "lesson-1",
        word: "grade",
        meaning: "成绩，等级；年级；评分，分级",
        partOfSpeech: "n.",
        lessonMeaning: "成绩，分数",
        collocation: {
          phrase: "get a good grade",
          translation: "取得好成绩",
        },
        contextQuestion: {
          sentence: "She worked hard and received a high grade on the final exam.",
          targetForm: "grade",
          distractors: ["年级，班级", "评分，给……打分"],
          explanation: "在此句中与 high 搭配表示考试中取得的'成绩，分数'。",
        },
        example: {
          text: "I got a good grade on my science project.",
          translation: "我的科学课项目得了个好成绩。",
          targetForm: "grade",
        },
        caregiverTip: "提示文本",
        reviewStatus: "draft",
        media: validBaseMedia,
      },
    ],
  };

  const report = validateCourseInput(course, () => true, "1.0.0-draft");
  assert.equal(report.errors.length, 0, `预期无错误，实际错误: ${JSON.stringify(report.errors)}`);
});

test("T61: malformed collocation and contextQuestion fields fail validation", () => {
  const baseCourse: SampleCourse = {
    manifest: {
      id: "middle-test",
      version: "1.0.0-draft",
      title: "初中测试",
      subject: "english",
      stage: "middle",
      status: "preview",
      description: "测试课程",
      attribution: "词光",
    },
    lessons: [{ id: "l1", title: "单元", subtitle: "副标题", entryIds: ["mid-1"] }],
    entries: [
      {
        kind: "english",
        id: "mid-1",
        topicId: "l1",
        word: "project",
        meaning: "项目，工程",
        example: {
          text: "We are doing a history project.",
          translation: "我们在做一个历史项目。",
          targetForm: "project",
        },
        caregiverTip: "提示",
        reviewStatus: "draft",
        media: validBaseMedia,
      },
    ],
  };

  // 1. collocation 缺少 translation
  const badCollocation = JSON.parse(JSON.stringify(baseCourse));
  badCollocation.entries[0].collocation = { phrase: "science project" };
  const r1 = validateCourseInput(badCollocation, () => true);
  assert.ok(r1.errors.some((e) => e.code === "invalid-collocation"));

  // 2. contextQuestion 干扰项为空数组
  const badDistractorsEmpty = JSON.parse(JSON.stringify(baseCourse));
  badDistractorsEmpty.entries[0].contextQuestion = { distractors: [] };
  const r2 = validateCourseInput(badDistractorsEmpty, () => true);
  assert.ok(r2.errors.some((e) => e.code === "invalid-context-question"));

  // 3. contextQuestion 干扰项超过 3 项
  const badDistractorsTooMany = JSON.parse(JSON.stringify(baseCourse));
  badDistractorsTooMany.entries[0].contextQuestion = { distractors: ["1", "2", "3", "4"] };
  const r3 = validateCourseInput(badDistractorsTooMany, () => true);
  assert.ok(r3.errors.some((e) => e.code === "invalid-context-question"));
});

test("T61: audit rejects duplicate distractors and distractor matching target meaning", () => {
  const makeCourse = (entryOverride: Partial<EnglishEntry>): SampleCourse => ({
    manifest: {
      id: "middle-test",
      version: "1.0.0-draft",
      title: "初中测试",
      subject: "english",
      stage: "middle",
      status: "preview",
      description: "测试课程",
      attribution: "词光",
    },
    lessons: [{ id: "l1", title: "单元", subtitle: "副", entryIds: ["mid-1"] }],
    entries: [
      {
        kind: "english",
        id: "mid-1",
        topicId: "l1",
        word: "rule",
        meaning: "规则，规定",
        lessonMeaning: "规则，规章",
        example: {
          text: "We must follow the library rule.",
          translation: "我们必须遵守图书馆规则。",
          targetForm: "rule",
        },
        caregiverTip: "提示",
        reviewStatus: "draft",
        media: validBaseMedia,
        ...entryOverride,
      },
    ],
  });

  // 1. 干扰项与本课正确释义重复
  const c1 = makeCourse({
    contextQuestion: {
      distractors: ["规则，规章", "统治，管辖"],
    },
  });
  const r1 = auditCourse(c1, () => true);
  assert.ok(r1.errors.some((e) => e.code === "distractor-matches-target"), "应检测出干扰项与正确释义相同");

  // 2. 干扰项内部重复
  const c2 = makeCourse({
    contextQuestion: {
      distractors: ["统治，管辖", "统治，管辖"],
    },
  });
  const r2 = auditCourse(c2, () => true);
  assert.ok(r2.errors.some((e) => e.code === "duplicate-distractor"), "应检测出干扰项相互重复");

  // 3. 独立短句未包含目标词形
  const c3 = makeCourse({
    contextQuestion: {
      sentence: "This sentence does not contain the target word.",
      targetForm: "rule",
      distractors: ["统治，管辖", "裁决，裁定"],
    },
  });
  const r3 = auditCourse(c3, () => true);
  assert.ok(r3.errors.some((e) => e.code === "invalid-context-sentence-target"), "应检测出短句缺少目标词");
});

test("T61: existing sample courses (primary, middle, hanzi) validate with zero structural errors", () => {
  for (const course of sampleCourses) {
    const report = validateCourseInput(course, () => true);
    assert.equal(report.errors.length, 0, `现有课程 ${course.manifest.id} 应当无结构错误`);
  }
});
