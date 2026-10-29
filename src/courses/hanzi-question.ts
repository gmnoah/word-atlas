import type { HanziEntry } from "./types";
import type { LearningSession } from "../learning/session";

/** Position is stated when a spoken phrase contains more than one character. */
export function hanziPosition(entry: HanziEntry): string | null {
  const position = [...entry.phrase].indexOf(entry.character);
  if (position < 0) return null;
  return ["一", "二", "三", "四", "五", "六"][position] ?? String(position + 1);
}

/** Draft phrase exercises identify a position, so multiple words cannot fit a blank. */
export function hanziQuestionPrompt(entry: HanziEntry, lessonId: string): string {
  if (!/^draft-hanzi-\d{2}$/.test(lessonId)) return entry.question;
  const numeral = hanziPosition(entry);
  if (!numeral) return entry.question;
  return `在“${entry.phrase}”里，找第${numeral}个字。`;
}

/** A visible target is a matching activity, not evidence of independent recognition. */
export function isHanziMatchingQuestion(lessonId: string, kind: string): boolean {
  return /^draft-hanzi-\d{2}$/.test(lessonId) && kind === "hanzi-question";
}

/** Preserve the original session for resume while excluding matching from recognition. */
export function hanziRecognitionSession(session: LearningSession, lessonId: string): LearningSession {
  return { ...session, attempts: Object.fromEntries(
    Object.entries(session.attempts).filter(([, attempt]) => !isHanziMatchingQuestion(lessonId, attempt.kind)),
  ) };
}
