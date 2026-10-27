import { HANZI_PARENT_POLICY, withPolicyOverrides, type LearningPolicy } from "../learning/policy";
import type { QuestionKind } from "../learning/questions";

/** Preschool settings only change how much is shown, never the recognition rule. */
export type HanziLessonMode = "lesson" | "co-read";

export interface HanziPolicyOptions {
  /** A usable Mandarin device voice exists, so listening can be offered. */
  voiceAvailable: boolean;
  /** Caregiver override in minutes; `null` keeps the course default. */
  timeLimitMinutes?: number | null;
  /** Co-reading browses characters without any graded recall. */
  coReading?: boolean;
  /** Number of characters to show while co-reading. */
  entryCount?: number;
}

const withVoice = (voiceAvailable: boolean): readonly QuestionKind[] =>
  voiceAvailable
    ? ["hanzi-question", "hanzi-picture", "hanzi-listen"]
    : ["hanzi-question", "hanzi-picture"];

/**
 * Hanzi never borrows the English accent fields: questions ask for the
 * character by meaning or picture, and listening uses Mandarin speech only.
 */
export function hanziPolicy(options: HanziPolicyOptions): LearningPolicy {
  const base: LearningPolicy = {
    ...HANZI_PARENT_POLICY,
    allowedKinds: withVoice(options.voiceAvailable),
  };
  const minutes =
    options.timeLimitMinutes === undefined || options.timeLimitMinutes === null
      ? null
      : Math.max(1, Math.floor(options.timeLimitMinutes));
  return withPolicyOverrides(base, {
    timeLimitMs: options.coReading
      ? null
      : minutes
        ? minutes * 60_000
        : base.timeLimitMs,
    // The caregiver's count is a ceiling, never a target the child must reach.
    newContentLimit: Math.max(
      1,
      Math.floor(options.entryCount ?? base.newContentLimit),
    ),
  });
}
