import assert from "node:assert/strict";
import test from "node:test";
import {
  MIDDLE_STARTER_POLICY,
  policyForCourse,
  policyById,
  withPolicyOverrides,
} from "./policy";
import {
  buildQuestion,
  evaluateQuestion,
  answerLabel,
} from "./questions";
import { createLearningSession, learningReducer } from "./session";
import type { EnglishEntry } from "../courses/types";
import { restoreLearningSession } from "./persistence";

const makeMiddleEntry = (id: string, word: string, distractors?: string[]): EnglishEntry => ({
  kind: "english",
  id,
  topicId: "campus-life",
  word,
  meaning: `${word} 的完整释义`,
  partOfSpeech: "n.",
  lessonMeaning: `${word} 的本课义项`,
  collocation: {
    phrase: `practice ${word}`,
    translation: `练习 ${word}`,
  },
  contextQuestion: distractors
    ? {
        sentence: `This is a sample sentence with ${word} inside.`,
        targetForm: word,
        distractors,
        explanation: `本句中选 ${word} 的本课义项。`,
      }
    : undefined,
  example: {
    text: `This is an example sentence with ${word}.`,
    translation: `这是一个例句。`,
    targetForm: word,
  },
  caregiverTip: "提示",
  reviewStatus: "draft",
  media: {
    image: `atlas/img/${word}.webp`,
    recording: `atlas/audio/uk/${word}.mp3`,
    exampleRecording: `atlas/audio/ex/${word}.mp3`,
    locale: "en-GB",
    source: "Word Atlas contributors",
  },
});

test("T63: MIDDLE_STARTER_POLICY defines distinct middle-school quotas and defaults", () => {
  assert.equal(MIDDLE_STARTER_POLICY.id, "middle-starter");
  assert.equal(MIDDLE_STARTER_POLICY.stage, "middle");
  assert.equal(MIDDLE_STARTER_POLICY.subject, "english");
  assert.equal(MIDDLE_STARTER_POLICY.newContentLimit, 5);
  assert.equal(MIDDLE_STARTER_POLICY.reviewLimit, 15);
  assert.equal(MIDDLE_STARTER_POLICY.introGroupSize, 3);
  assert.equal(MIDDLE_STARTER_POLICY.timeLimitMs, 12 * 60_000);
  assert.equal(MIDDLE_STARTER_POLICY.timingAffectsGrade, false);
  assert.equal(MIDDLE_STARTER_POLICY.showCountdown, false);
  assert.ok(MIDDLE_STARTER_POLICY.allowedKinds.includes("context-meaning"));
  assert.ok(MIDDLE_STARTER_POLICY.allowedKinds.includes("listen-word"));
  assert.ok(MIDDLE_STARTER_POLICY.allowedKinds.includes("meaning"));
  assert.ok(MIDDLE_STARTER_POLICY.allowedKinds.includes("spell"));

  // Check policy lookup
  assert.equal(policyById("middle-starter")?.id, "middle-starter");

  // Check policyForCourse resolution
  const policyByStage = policyForCourse({ id: "custom-middle", stage: "middle", subject: "english" });
  assert.equal(policyByStage.id, "middle-starter");
  assert.equal(policyByStage.newContentLimit, 5);

  const policyByIdMatch = policyForCourse({ id: "middle-english", stage: "middle", subject: "english" });
  assert.equal(policyByIdMatch.id, "middle-starter");

  // Overrides applied correctly
  const overridden = withPolicyOverrides(MIDDLE_STARTER_POLICY, { newContentLimit: 8, reviewLimit: 20 });
  assert.equal(overridden.newContentLimit, 8);
  assert.equal(overridden.reviewLimit, 20);
});

test("T64: context-meaning evaluates successfully with distractors and downgrades when missing", () => {
  const target = makeMiddleEntry("mid-grade", "grade", ["年级，班级", "评分，分级"]);
  const pool = [
    target,
    makeMiddleEntry("mid-exam", "exam", ["体检", "检查"]),
    makeMiddleEntry("mid-project", "project", ["预测", "投射"]),
  ];

  // 1. 成功生成 context-meaning 题目
  const plan = evaluateQuestion("context-meaning", target, pool, MIDDLE_STARTER_POLICY, 42);
  assert.ok(plan, "有 distractors 时应生成 context-meaning plan");
  assert.equal(plan.kind, "context-meaning");
  assert.equal(plan.prompt, "sentence");
  assert.equal(plan.answer, "text");
  assert.ok(plan.options.includes(target.id));
  assert.ok(plan.options.some((opt) => opt.startsWith("distractor:")));
  assert.equal(plan.options.length, 3); // 1 正确 + 2 干扰项

  // answerLabel 能够返回 lessonMeaning
  assert.equal(answerLabel(target, "context-meaning"), "grade 的本课义项");

  // 2. 缺少 distractors 时，context-meaning 无法通过资格检查并返回 null
  const noDistractors = makeMiddleEntry("mid-rule", "rule");
  const nullPlan = evaluateQuestion("context-meaning", noDistractors, pool, MIDDLE_STARTER_POLICY, 42);
  assert.equal(nullPlan, null, "缺少 distractors 时不能强行出 context-meaning 题");

  // 3. buildQuestion 会平滑降级到其他已启用的题型（如 listen-word 或 meaning）
  const fallbackPlan = buildQuestion(noDistractors, pool, MIDDLE_STARTER_POLICY, 42);
  assert.ok(fallbackPlan, "应平滑降级生成符合资格的备选题型");
  assert.notEqual(fallbackPlan.kind, "context-meaning", "降级题型不应是 context-meaning");
  assert.ok(
    fallbackPlan.kind === "listen-word" || fallbackPlan.kind === "meaning" || fallbackPlan.kind === "spell",
  );
});

test("T64: session handles context-meaning answer correctly with first attempt scoring and practice retry", () => {
  const target = makeMiddleEntry("mid-project", "project", ["预测，推算", "放映，投射"]);
  const pool = [target, makeMiddleEntry("mid-exam", "exam", ["体检"])];

  const contextPolicy = {
    ...MIDDLE_STARTER_POLICY,
    allowedKinds: ["context-meaning" as const, "meaning" as const],
  };

  const session = createLearningSession({
    courseId: "middle-english",
    contentVersion: "1.0.0-draft",
    policy: contextPolicy,
    now: 1000,
    seed: 123,
    due: [],
    fresh: [target],
    pool,
  });

  assert.equal(session.steps.length > 0, true);
  // 第一步为 intro
  assert.equal(session.steps[0].kind, "intro");

  // 将会话推进至复习题目步
  const questionStepIndex = session.steps.findIndex((s) => s.kind === "context-meaning");
  assert.ok(questionStepIndex > 0, "会话中应包含 context-meaning 步骤");

  const qStep = session.steps[questionStepIndex];
  assert.ok(qStep.options?.includes(target.id));

  // 模拟回答错误（选择干扰项）
  const distractorId = qStep.options?.find((id) => id !== target.id)!;
  assert.ok(distractorId.startsWith("distractor:"));

  const sessionAtQuestion = { ...session, index: questionStepIndex, stepStartedAt: 2000, lastTickAt: 2000 };
  const afterWrong = learningReducer(sessionAtQuestion, {
    type: "answer",
    at: 2500,
    optionId: distractorId,
  });

  assert.ok(afterWrong.attempts[target.id], "首次回答记录应被写入");
  const attemptRes = afterWrong.attempts[target.id].result;
  assert.equal(attemptRes.outcome, "answered");
  if (attemptRes.outcome === "answered") {
    assert.equal(attemptRes.correct, false);
  }
  // 错题应触发重试步骤加入
  assert.ok(afterWrong.steps.some((s) => s.retry && s.contentId === target.id));
});

test("T64: persistence validates and restores context-meaning steps safely", () => {
  const target = makeMiddleEntry("mid-exam", "exam", ["身体检查", "仔细审视"]);
  const pool = [target];

  const validStep = {
    contentId: target.id,
    kind: "context-meaning",
    options: [target.id, "distractor:0", "distractor:1"],
  };

  const rawSession = {
    version: 1,
    id: "sess-1",
    courseId: "middle-english",
    contentVersion: "1.0.0-draft",
    policyId: "middle-starter",
    startedAt: 1000,
    timeLimitMs: 12 * 60_000,
    steps: [{ contentId: target.id, kind: "intro" }, validStep],
    index: 1,
    attempts: {},
    practice: [],
    retryPlans: {},
    retryCursor: {},
    answeredSteps: {},
    support: "independent",
    introduced: [target.id],
    newIds: [target.id],
    reviewIds: [],
    activeMs: 500,
    lastTickAt: 1500,
    stepStartedAt: 1200,
    stepActiveMs: 200,
    visible: true,
  };

  const context = {
    courseId: "middle-english",
    contentVersion: "1.0.0-draft",
    policy: MIDDLE_STARTER_POLICY,
    entries: pool,
    now: 2000,
  };

  const restored = restoreLearningSession(rawSession, context);
  assert.equal(restored.status, "ok", "合法 context-meaning 会话断点应正常恢复");
  assert.ok(restored.session);
  assert.equal(restored.session.steps[1].kind, "context-meaning");

  // 篡改干扰项为不存在的索引，校验应识别为损坏并重构
  const corruptedSession = {
    ...rawSession,
    steps: [
      { contentId: target.id, kind: "intro" },
      { contentId: target.id, kind: "context-meaning", options: [target.id, "distractor:99"] },
    ],
  };
  const restoredCorrupted = restoreLearningSession(corruptedSession, context);
  assert.equal(restoredCorrupted.status, "repaired");
  assert.ok(restoredCorrupted.session);
  assert.notEqual(restoredCorrupted.session.steps[1]?.options?.[1], "distractor:99");
});
