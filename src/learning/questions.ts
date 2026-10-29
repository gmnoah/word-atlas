import type { LearningEntry, Subject } from "../courses/types";
import { entryLabel } from "../courses/types";
import { hashSeed, normalize, shuffle } from "../lib/text";
import type { LearningPolicy } from "./policy";

export type QuestionKind =
  | "meaning"
  | "picture"
  | "listen"
  | "spell"
  | "listen-picture"
  | "picture-word"
  | "listen-word"
  | "hanzi-listen"
  | "hanzi-picture"
  | "hanzi-question";

export type PromptMode =
  | "word"
  | "meaning"
  | "audio"
  | "image"
  | "character"
  | "question"
  | "spell";
export type AnswerMode = "text" | "image" | "input";

export interface QuestionTypeDefinition {
  subject: Subject;
  prompt: PromptMode;
  answer: AnswerMode;
  /** The target must provide this media before the type can be used. */
  targetImage: boolean;
  targetAudio: boolean;
  /** Device speech can stand in for a recording (Mandarin preview only). */
  deviceSpeech?: boolean;
  /** Every distractor must also provide an image, not only the target. */
  optionImages: boolean;
  /** The learner types rather than taps. */
  input: boolean;
}

export const questionTypes: Record<QuestionKind, QuestionTypeDefinition> = {
  meaning: {
    subject: "english",
    prompt: "word",
    answer: "text",
    targetImage: false,
    targetAudio: false,
    optionImages: false,
    input: false,
  },
  picture: {
    subject: "english",
    prompt: "image",
    answer: "text",
    targetImage: true,
    targetAudio: false,
    optionImages: false,
    input: false,
  },
  listen: {
    subject: "english",
    prompt: "audio",
    answer: "text",
    targetImage: false,
    targetAudio: true,
    optionImages: false,
    input: false,
  },
  spell: {
    subject: "english",
    prompt: "spell",
    answer: "input",
    targetImage: false,
    targetAudio: false,
    optionImages: false,
    input: true,
  },
  "listen-picture": {
    subject: "english",
    prompt: "audio",
    answer: "image",
    targetImage: true,
    targetAudio: true,
    optionImages: true,
    input: false,
  },
  "picture-word": {
    subject: "english",
    prompt: "image",
    answer: "text",
    targetImage: true,
    targetAudio: false,
    optionImages: false,
    input: false,
  },
  "listen-word": {
    subject: "english",
    prompt: "audio",
    answer: "text",
    targetImage: false,
    targetAudio: true,
    optionImages: false,
    input: false,
  },
  "hanzi-listen": {
    subject: "hanzi",
    prompt: "audio",
    answer: "text",
    targetImage: false,
    targetAudio: true,
    // The 20 draft characters have no recordings yet. A Mandarin device voice
    // may read the character; a failure is reported and never faked.
    deviceSpeech: true,
    optionImages: false,
    input: false,
  },
  "hanzi-picture": {
    subject: "hanzi",
    prompt: "image",
    answer: "text",
    targetImage: true,
    targetAudio: false,
    optionImages: false,
    input: false,
  },
  "hanzi-question": {
    subject: "hanzi",
    prompt: "question",
    answer: "text",
    targetImage: false,
    targetAudio: false,
    optionImages: false,
    input: false,
  },
};

export interface QuestionPlan {
  kind: QuestionKind;
  prompt: PromptMode;
  answer: AnswerMode;
  /** Content IDs including the correct target. Empty for typed answers. */
  options: string[];
  /** Expected typed answer. Only present for input question types. */
  expected?: string;
}

export interface BuildQuestionOptions {
  excludeKinds?: readonly QuestionKind[];
}

/** The text a learner taps for a text-answer question. */
export function answerLabel(entry: LearningEntry, kind: QuestionKind): string {
  if (kind === "meaning") return entry.kind === "english" ? entry.meaning : entry.phrase;
  return entryLabel(entry);
}

function answerKey(entry: LearningEntry, kind: QuestionKind): string | null {
  if (questionTypes[kind].answer === "image") return entry.media.image || null;
  const label = answerLabel(entry, kind);
  return label ? normalize(label) : null;
}

/** A character-only recording cannot distinguish identical Mandarin readings. */
export function sameHanziPronunciation(a: LearningEntry, b: LearningEntry): boolean {
  return a.kind === "hanzi" && b.kind === "hanzi" && !!a.pinyin.trim() &&
    a.pinyin.trim().normalize("NFC").toLowerCase() === b.pinyin.trim().normalize("NFC").toLowerCase();
}

function supportsTarget(entry: LearningEntry, kind: QuestionKind): boolean {
  const definition = questionTypes[kind];
  if (entry.kind !== definition.subject) return false;
  if (definition.targetImage && !entry.media.image) return false;
  if (
    definition.targetAudio &&
    !entry.media.recording &&
    !definition.deviceSpeech
  )
    return false;
  if (kind === "hanzi-question" && entry.kind === "hanzi" && !entry.question) return false;
  if (kind === "meaning" && entry.kind === "english" && !entry.meaning) return false;
  return true;
}

function uniqueEntries(entries: readonly LearningEntry[]): LearningEntry[] {
  const seen = new Set<string>();
  const out: LearningEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
  }
  return out;
}

/**
 * Build one question only if the target and every distractor satisfy the
 * declared media needs. Returning null is a normal outcome; callers must pick
 * another type or omit the question instead of weakening the answer.
 */
export function evaluateQuestion(
  kind: QuestionKind,
  target: LearningEntry,
  pool: readonly LearningEntry[],
  policy: LearningPolicy,
  seed: number,
): QuestionPlan | null {
  const definition = questionTypes[kind];
  if (!supportsTarget(target, kind)) return null;

  if (definition.input) {
    const expected = answerLabel(target, kind);
    if (!expected.trim()) return null;
    return {
      kind,
      prompt: definition.prompt,
      answer: definition.answer,
      options: [],
      expected,
    };
  }

  const targetKey = answerKey(target, kind);
  if (!targetKey) return null;

  const candidates = uniqueEntries(pool).filter((entry) => {
    if (entry.id === target.id) return false;
    if (entry.kind !== target.kind) return false;
    if (kind === "hanzi-listen" && sameHanziPronunciation(target, entry)) return false;
    if (definition.optionImages && !entry.media.image) return false;
    const key = answerKey(entry, kind);
    return !!key && key !== targetKey;
  });

  const minOptions = Math.max(
    2,
    Number.isFinite(policy.minOptions) ? Math.floor(policy.minOptions) : 2,
  );
  const desired = Math.max(
    minOptions,
    Number.isFinite(policy.optionCount) ? Math.floor(policy.optionCount) : minOptions,
  );
  const seenAnswers = new Set([targetKey]);
  const distractors = shuffle(candidates, seed)
    .filter((entry) => {
      const key = answerKey(entry, kind)!;
      if (seenAnswers.has(key)) return false;
      seenAnswers.add(key);
      return true;
    })
    .slice(0, Math.max(0, desired - 1))
    .map((entry) => entry.id);
  const options = [target.id, ...distractors];
  if (options.length < minOptions) return null;

  return {
    kind,
    prompt: definition.prompt,
    answer: definition.answer,
    options: shuffle(options, seed + 1),
  };
}

/**
 * Pick the first allowed type that the target can actually support. The
 * starting point rotates by entry so the same word does not always get the
 * same format, while the fallback order remains deterministic.
 */
export function buildQuestion(
  target: LearningEntry,
  pool: readonly LearningEntry[],
  policy: LearningPolicy,
  seed: number,
  options: BuildQuestionOptions = {},
): QuestionPlan | null {
  const excluded = new Set(options.excludeKinds ?? []);
  const kinds = policy.allowedKinds.filter((kind) => !excluded.has(kind));
  if (!kinds.length) return null;
  const start = hashSeed(`${target.id}:${seed}`) % kinds.length;
  for (let offset = 0; offset < kinds.length; offset++) {
    const kind = kinds[(start + offset) % kinds.length];
    const plan = evaluateQuestion(kind, target, pool, policy, seed + offset);
    if (plan) return plan;
  }
  return null;
}

export function questionNeedsAudio(kind: QuestionKind): boolean {
  return questionTypes[kind].targetAudio;
}

export function questionNeedsImage(kind: QuestionKind): boolean {
  return questionTypes[kind].targetImage;
}

export function questionUsesInput(kind: QuestionKind): boolean {
  return questionTypes[kind].input;
}
