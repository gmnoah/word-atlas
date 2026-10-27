import type { AttemptResult, AttemptSupport } from "../courses/types";
import { Rating, type Grade } from "../store/srs";
import type { LearningPolicy } from "./policy";
import type { QuestionKind } from "./questions";

export interface AnswerAttemptInput {
  contentId: string;
  kind: QuestionKind;
  correct: boolean;
  support: AttemptSupport;
  elapsedMs: number;
  /** False for a practice retry or a repeated click in the same item. */
  firstValid: boolean;
}

export interface ScoredAttempt {
  result: AttemptResult;
  grade: Grade | null;
  /** Whether this attempt may touch memory / accuracy statistics. */
  counted: boolean;
  /** An independent first-attempt success, never a hinted/assisted one. */
  independent: boolean;
}

/**
 * IELTS keeps its historic speed-sensitive grades. Child policies deliberately
 * do not: taking longer to tap the right answer must not lower a child's grade.
 */
export function gradeForPolicy(
  kind: QuestionKind,
  correct: boolean,
  elapsedMs: number,
  support: AttemptSupport,
  policy: LearningPolicy,
): Grade {
  if (!correct) return Rating.Again;
  if (support === "hinted") return Rating.Hard;
  if (!policy.timingAffectsGrade) return Rating.Good;
  const slow = kind === "spell" ? 20_000 : 9_000;
  const fast = kind === "spell" ? 6_000 : 2_500;
  if (elapsedMs > slow) return Rating.Hard;
  if (elapsedMs < fast && kind === "spell") return Rating.Easy;
  return Rating.Good;
}

export function scoreAttempt(
  input: AnswerAttemptInput,
  policy: LearningPolicy,
): ScoredAttempt {
  const result: AttemptResult = {
    outcome: "answered",
    contentId: input.contentId,
    correct: input.correct,
    support: input.support,
  };
  if (!input.firstValid) {
    return { result, grade: null, counted: false, independent: false };
  }
  // Caregiver assistance is recorded honestly but never updates the independent
  // identification card in this version.
  if (input.support === "assisted") {
    return { result, grade: null, counted: false, independent: false };
  }
  return {
    result,
    grade: gradeForPolicy(
      input.kind,
      input.correct,
      input.elapsedMs,
      input.support,
      policy,
    ),
    counted: true,
    independent: input.support === "independent" && input.correct,
  };
}

export function skippedResult(contentId: string): AttemptResult {
  return { outcome: "skipped", contentId };
}

export function resourceErrorResult(contentId: string): AttemptResult {
  return { outcome: "resource-error", contentId };
}
