import type { ActiveSession, QuizKind, Step } from "./store";

const QUIZ_KINDS = new Set<QuizKind>(["meaning", "picture", "listen", "spell"]);
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const isNumber = (value: unknown, min = 0): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min;
const stringList = (value: unknown, limit: number): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length <= 200).slice(0, limit)
    : [];

function sanitizeStep(value: unknown): Step | null {
  if (!isObject(value) || typeof value.id !== "string" || !value.id || value.id.length > 200)
    return null;
  if (value.kind === "intro") {
    if (value.options !== undefined && (!Array.isArray(value.options) || value.options.length))
      return null;
    return { id: value.id, kind: "intro" };
  }
  if (!QUIZ_KINDS.has(value.kind as QuizKind)) return null;
  const kind = value.kind as QuizKind;
  if (kind === "spell") {
    if (value.options !== undefined && (!Array.isArray(value.options) || value.options.length))
      return null;
    return {
      id: value.id,
      kind,
      retry: value.retry === true ? true : undefined,
    };
  }
  if (!Array.isArray(value.options) || value.options.length < 2) return null;
  const options = value.options.filter(
    (option): option is string => typeof option === "string" && option.length <= 200,
  );
  if (options.length !== value.options.length) return null;
  if (new Set(options).size !== options.length || !options.includes(value.id)) return null;
  return {
    id: value.id,
    kind,
    retry: value.retry === true ? true : undefined,
    options,
  };
}

/**
 * Persisted sessions are untrusted input. Structural damage drops the session
 * while leaving cards, bookmarks and daily history untouched; a broken option
 * list must never become a "correct" question.
 */
export function sanitizeActiveSession(value: unknown): ActiveSession | null {
  if (!isObject(value)) return null;
  if (typeof value.id !== "string" || !value.id || value.id.length > 120) return null;
  if (!isNumber(value.started)) return null;
  if (!Array.isArray(value.steps) || value.steps.length > 1000) return null;
  const steps = value.steps.map(sanitizeStep);
  if (steps.some((step) => !step)) return null;
  if (!isNumber(value.index) || Math.floor(value.index) !== value.index || value.index > steps.length)
    return null;
  if (!isObject(value.graded)) return null;
  const stepIds = new Set((steps as Step[]).map((step) => step.id));
  const graded: ActiveSession["graded"] = {};
  for (const [id, grade] of Object.entries(value.graded)) {
    if (!stepIds.has(id)) continue;
    if (id.length > 200 || ![1, 2, 3, 4].includes(grade as number)) continue;
    graded[id] = grade as ActiveSession["graded"][string];
  }
  const pending =
    isObject(value.pending) &&
    typeof value.pending.correct === "boolean" &&
    typeof value.pending.value === "string" &&
    value.pending.value.length <= 200
      ? { correct: value.pending.correct, value: value.pending.value }
      : undefined;
  const session: ActiveSession = {
    id: value.id,
    started: value.started,
    steps: steps as Step[],
    index: value.index,
    graded,
    newIds: stringList(value.newIds, 1000).filter((id) => stepIds.has(id)),
    reviewIds: stringList(value.reviewIds, 1000).filter((id) => stepIds.has(id)),
    pending,
    finished: isNumber(value.finished) ? value.finished : undefined,
  };
  if (typeof value.contentVersion === "string" && value.contentVersion.length <= 80)
    session.contentVersion = value.contentVersion;
  return session;
}
