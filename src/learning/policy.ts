import type { AttemptSupport, Stage, Subject } from "../courses/types";
import type { QuestionKind } from "./questions";

export type PolicyId = "ielts" | "primary-starter" | "primary-advanced" | "hanzi-parent";

/**
 * A policy is the only place that decides how much content a session may hold,
 * which question formats a stage may use, and how answers affect memory.
 *
 * IELTS keeps its legacy values so existing learning behaves exactly as before.
 * Child policies deliberately ignore answer speed: a slow independent answer is
 * still an independent success.
 */
export interface LearningPolicy {
  id: PolicyId;
  label: string;
  subject: Subject;
  stage: Stage;
  newContentLimit: number;
  reviewLimit: number;
  introGroupSize: number;
  allowedKinds: readonly QuestionKind[];
  optionCount: number;
  minOptions: number;
  maxPracticeRetries: number;
  /** Foreground active time only. `null` means no automatic time end. */
  timeLimitMs: number | null;
  /** IELTS grades partly by speed; child policies never do. */
  timingAffectsGrade: boolean;
  supports: readonly AttemptSupport[];
  /** Product rule: never show a countdown to a child. */
  showCountdown: false;
}

const freeze = <T extends LearningPolicy>(policy: T): T => Object.freeze(policy);

export const IELTS_POLICY = freeze({
  id: "ielts",
  label: "雅思英语",
  subject: "english",
  stage: "ielts",
  newContentLimit: 10,
  reviewLimit: 120,
  introGroupSize: 5,
  allowedKinds: ["meaning", "picture", "listen", "spell"],
  optionCount: 4,
  minOptions: 2,
  maxPracticeRetries: 2,
  timeLimitMs: null,
  timingAffectsGrade: true,
  supports: ["hinted"],
  showCountdown: false,
});

export const PRIMARY_STARTER_POLICY = freeze({
  id: "primary-starter",
  label: "小学启蒙",
  subject: "english",
  stage: "primary",
  newContentLimit: 3,
  reviewLimit: 8,
  introGroupSize: 2,
  allowedKinds: ["listen-picture", "picture-word", "listen-word"],
  optionCount: 2,
  minOptions: 2,
  maxPracticeRetries: 2,
  timeLimitMs: 8 * 60_000,
  timingAffectsGrade: false,
  supports: ["hinted", "assisted"],
  showCountdown: false,
});

export const PRIMARY_ADVANCED_POLICY = freeze({
  id: "primary-advanced",
  label: "小学进阶",
  subject: "english",
  stage: "primary",
  newContentLimit: 5,
  reviewLimit: 15,
  introGroupSize: 3,
  allowedKinds: ["picture-word", "listen-word", "meaning", "spell"],
  optionCount: 3,
  minOptions: 2,
  maxPracticeRetries: 2,
  timeLimitMs: 12 * 60_000,
  timingAffectsGrade: false,
  supports: ["hinted", "assisted"],
  showCountdown: false,
}) satisfies LearningPolicy;

export const HANZI_PARENT_POLICY = freeze({
  id: "hanzi-parent",
  label: "汉字亲子",
  subject: "hanzi",
  stage: "preschool",
  newContentLimit: 2,
  reviewLimit: 4,
  introGroupSize: 2,
  allowedKinds: ["hanzi-listen", "hanzi-picture", "hanzi-question"],
  optionCount: 2,
  minOptions: 2,
  maxPracticeRetries: 2,
  timeLimitMs: 5 * 60_000,
  timingAffectsGrade: false,
  supports: ["hinted", "assisted"],
  showCountdown: false,
}) satisfies LearningPolicy;

export const learningPolicies: readonly LearningPolicy[] = [
  IELTS_POLICY,
  PRIMARY_STARTER_POLICY,
  PRIMARY_ADVANCED_POLICY,
  HANZI_PARENT_POLICY,
];

export interface CoursePolicyIdentity {
  id: string;
  subject: Subject;
  stage: Stage;
}

export interface PolicyOverrides {
  newContentLimit?: number;
  reviewLimit?: number;
  timeLimitMs?: number | null;
}

const integerAtLeastZero = (value: number) => Math.max(0, Math.floor(value));

export function withPolicyOverrides(
  policy: LearningPolicy,
  overrides: PolicyOverrides = {},
): LearningPolicy {
  const next: LearningPolicy = {
    ...policy,
    newContentLimit:
      overrides.newContentLimit === undefined
        ? policy.newContentLimit
        : integerAtLeastZero(overrides.newContentLimit),
    reviewLimit:
      overrides.reviewLimit === undefined
        ? policy.reviewLimit
        : integerAtLeastZero(overrides.reviewLimit),
    timeLimitMs:
      overrides.timeLimitMs === undefined ? policy.timeLimitMs : overrides.timeLimitMs,
  };
  return Object.freeze(next);
}

/** Map a course identity to the strategy that owns its session rules. */
export function policyForCourse(
  course: CoursePolicyIdentity,
  overrides: PolicyOverrides = {},
): LearningPolicy {
  if (course.subject === "hanzi") return withPolicyOverrides(HANZI_PARENT_POLICY, overrides);
  if (course.stage === "ielts") return withPolicyOverrides(IELTS_POLICY, overrides);
  if (course.id === "primary-advanced") {
    return withPolicyOverrides(PRIMARY_ADVANCED_POLICY, overrides);
  }
  return withPolicyOverrides(PRIMARY_STARTER_POLICY, overrides);
}

/** IELTS keeps its settings-driven new-word cap and optional spelling. */
export function ieltsPolicyFromSettings(settings: {
  dailyNew: number;
  spell: boolean;
}): LearningPolicy {
  return withPolicyOverrides(
    {
      ...IELTS_POLICY,
      allowedKinds: settings.spell
        ? ["meaning", "picture", "listen", "spell"]
        : ["meaning", "picture", "listen"],
    } as LearningPolicy,
    { newContentLimit: settings.dailyNew },
  );
}

export function policyById(id: string): LearningPolicy | undefined {
  return learningPolicies.find((policy) => policy.id === id);
}
