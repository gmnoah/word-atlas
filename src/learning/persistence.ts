import type { AttemptResult, AttemptSupport, LearningEntry } from "../courses/types";
import { hashSeed, normalize } from "../lib/text";
import type { Grade } from "../store/srs";
import type { LearningPolicy } from "./policy";
import {
  answerLabel,
  buildQuestion,
  questionTypes,
  sameHanziPronunciation,
  type QuestionKind,
} from "./questions";
import {
  buildRetryPlans,
  type LearningAttempt,
  type LearningSession,
  type LearningStep,
  type SessionEndReason,
  type StepKind,
} from "./session";

export interface RestoreContext {
  courseId: string;
  contentVersion: string;
  policy: LearningPolicy;
  entries: readonly LearningEntry[];
  now?: number;
}

export type RestoreStatus = "ok" | "repaired" | "rejected";

export interface RestoreResult {
  status: RestoreStatus;
  session: LearningSession | null;
  reason?: string;
  preservedAttempts: LearningAttempt[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const isNumber = (value: unknown, min = 0): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min;
const isSupport = (value: unknown): value is AttemptSupport =>
  value === "independent" || value === "hinted" || value === "assisted";
const isStepKind = (value: unknown): value is StepKind =>
  value === "intro" || (typeof value === "string" && Object.hasOwn(questionTypes, value));
const isEndReason = (value: unknown): value is SessionEndReason =>
  value === "completed" || value === "time-limit" || value === "user-stopped";

function sanitizeResult(value: unknown): AttemptResult | null {
  if (!isObject(value) || typeof value.contentId !== "string") return null;
  if (value.outcome === "skipped" || value.outcome === "resource-error") {
    return { outcome: value.outcome, contentId: value.contentId };
  }
  if (value.outcome === "answered" && typeof value.correct === "boolean" && isSupport(value.support)) {
    return {
      outcome: "answered",
      contentId: value.contentId,
      correct: value.correct,
      support: value.support,
    };
  }
  return null;
}

function sanitizeAttempt(value: unknown): LearningAttempt | null {
  if (!isObject(value)) return null;
  const result = sanitizeResult(value.result);
  if (!result || typeof value.contentId !== "string" || result.contentId !== value.contentId) return null;
  if (!isStepKind(value.kind)) return null;
  // An intro has no answer, but a skipped intro is a real learning record: it
  // means the child never met the word, so its recall question must stay gone.
  if (value.kind === "intro" && result.outcome !== "skipped") return null;
  if (!isNumber(value.at) || !isNumber(value.activeMs) || !isNumber(value.elapsedMs)) return null;
  if (typeof value.first !== "boolean" || typeof value.counted !== "boolean") return null;
  const grade =
    value.grade === null || value.grade === undefined
      ? null
      : [1, 2, 3, 4].includes(value.grade as number)
        ? (value.grade as Grade)
        : undefined;
  if (grade === undefined) return null;
  if (value.kind === "intro" && (grade !== null || value.first || value.counted)) return null;
  const counted = value.counted && grade !== null && value.first &&
    result.outcome === "answered" && result.support !== "assisted";
  return {
    contentId: value.contentId,
    kind: value.kind,
    result,
    first: value.first,
    counted,
    grade: counted ? grade : null,
    elapsedMs: value.elapsedMs,
    at: value.at,
    activeMs: value.activeMs,
  };
}

function answerKeysMatch(
  step: LearningStep,
  entry: LearningEntry,
  entriesById: Map<string, LearningEntry>,
): boolean {
  const definition = questionTypes[step.kind as QuestionKind];
  if (definition.answer === "input") {
    return (
      typeof step.expected === "string" && !!step.expected &&
      normalize(step.expected) === normalize(answerLabel(entry, step.kind as QuestionKind))
    );
  }
  if (!Array.isArray(step.options) || step.options.length < 2) return false;
  if (!step.options.every((id) => typeof id === "string")) return false;
  if (!step.options.includes(entry.id)) return false;
  if (new Set(step.options).size !== step.options.length) return false;
  if (step.kind === "hanzi-listen" && step.options.some((id) => {
    const option = entriesById.get(id);
    return id !== entry.id && !!option && sameHanziPronunciation(entry, option);
  })) return false;
  const keys = step.options.map((id) => {
    const option = entriesById.get(id);
    if (!option || option.kind !== entry.kind) return null;
    if (definition.optionImages && !option.media.image) return null;
    if (definition.answer === "image") return option.media.image || null;
    const label = answerLabel(option, step.kind as QuestionKind);
    return label ? normalize(label) : null;
  });
  if (keys.some((key) => !key)) return false;
  const targetKey = definition.answer === "image"
    ? entry.media.image
    : normalize(answerLabel(entry, step.kind as QuestionKind));
  return !!targetKey && new Set(keys).size === keys.length && keys.filter((key) => key === targetKey).length === 1;
}

function validStep(
  raw: unknown,
  context: RestoreContext,
  entriesById: Map<string, LearningEntry>,
): raw is LearningStep {
  if (!isObject(raw) || typeof raw.contentId !== "string" || !isStepKind(raw.kind)) return false;
  const entry = entriesById.get(raw.contentId);
  if (!entry) return false;
  if (raw.kind === "intro")
    return (
      raw.retry !== true &&
      (!raw.options || (Array.isArray(raw.options) && raw.options.length === 0))
    );
  const definition = questionTypes[raw.kind as QuestionKind];
  if (!definition) return false;
  if (!context.policy.allowedKinds.includes(raw.kind as QuestionKind)) return false;
  if (entry.kind !== definition.subject) return false;
  if (definition.targetImage && !entry.media.image) return false;
  if (
    definition.targetAudio &&
    !entry.media.recording &&
    !definition.deviceSpeech
  )
    return false;
  if (raw.kind === "hanzi-question" && entry.kind === "hanzi" && !entry.question) return false;
  const step = raw as unknown as LearningStep;
  if (definition.input) return !step.options?.length && answerKeysMatch(step, entry, entriesById);
  return answerKeysMatch(step, entry, entriesById);
}

function rebuildStep(
  raw: unknown,
  index: number,
  context: RestoreContext,
  entriesById: Map<string, LearningEntry>,
): LearningStep | null {
  if (!isObject(raw) || typeof raw.contentId !== "string") return null;
  const entry = entriesById.get(raw.contentId);
  if (!entry) return null;
  const retry = raw.retry === true;
  // An intro carries no answer, so a damaged intro is rebuilt as an intro
  // instead of silently becoming a graded question.
  if (raw.kind === "intro") return { contentId: entry.id, kind: "intro" };
  const firstKind =
    isObject(raw) && isStepKind(raw.kind) && raw.kind !== "intro"
      ? (raw.kind as QuestionKind)
      : undefined;
  const plan = buildQuestion(entry, context.entries, context.policy, hashSeed(`${entry.id}:${index}`), {
    excludeKinds: retry && firstKind ? [firstKind] : [],
  });
  if (!plan) return null;
  return {
    contentId: entry.id,
    kind: plan.kind,
    options: plan.options,
    expected: plan.expected,
    retry,
  };
}

function sanitizeRetryPlans(
  raw: unknown,
  steps: LearningStep[],
  context: RestoreContext,
  entriesById: Map<string, LearningEntry>,
): Record<string, LearningStep[]> {
  const result: Record<string, LearningStep[]> = {};
  const byId = new Map<string, LearningStep>();
  for (const step of steps) {
    if (step.kind !== "intro" && !byId.has(step.contentId)) byId.set(step.contentId, step);
  }
  const source = isObject(raw) ? raw : {};
  for (const [contentId, firstStep] of byId) {
    const entry = entriesById.get(contentId);
    if (!entry) continue;
    const rawPlans = source[contentId];
    const valid = Array.isArray(rawPlans)
      ? rawPlans
          .filter(
            (plan) =>
              validStep(plan, context, entriesById) &&
              isObject(plan) &&
              plan.contentId === contentId &&
              plan.retry === true &&
              plan.kind !== "intro",
          )
          .slice(0, context.policy.maxPracticeRetries)
      : [];
    result[contentId] = valid.length
      ? (valid as LearningStep[])
      : buildRetryPlans(
          entry,
          context.entries,
          context.policy,
          hashSeed(`${contentId}:plans`),
          firstStep.kind as QuestionKind,
        );
  }
  return result;
}

function sanitizeIdList(value: unknown, ids: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && ids.has(id)))];
}

/**
 * Restore a persisted learning session. A wrong course/version is rejected so
 * old content cannot be mixed with new; a damaged step is rebuilt from the
 * current course while completed attempts remain intact.
 */
export function restoreLearningSession(raw: unknown, context: RestoreContext): RestoreResult {
  if (!isObject(raw) || raw.version !== 1) {
    return { status: "rejected", session: null, reason: "session-version", preservedAttempts: [] };
  }
  const preservedAttempts: LearningAttempt[] = [];
  if (isObject(raw.attempts)) {
    for (const attempt of Object.values(raw.attempts)) {
      const sanitized = sanitizeAttempt(attempt);
      if (sanitized) preservedAttempts.push(sanitized);
    }
  }
  if (raw.courseId !== context.courseId)
    return { status: "rejected", session: null, reason: "course-mismatch", preservedAttempts };
  if (raw.contentVersion !== context.contentVersion)
    return { status: "rejected", session: null, reason: "content-version", preservedAttempts };
  if (raw.policyId !== context.policy.id)
    return { status: "rejected", session: null, reason: "policy-mismatch", preservedAttempts };

  const entriesById = new Map(context.entries.map((entry) => [entry.id, entry]));
  const rawStepCount = Array.isArray(raw.steps) ? raw.steps.length : 0;
  const rawSteps = Array.isArray(raw.steps) ? raw.steps.slice(0, 1000) : [];
  const rawIndexValue = isNumber(raw.index) ? raw.index : 0;
  const rawIndex = Math.floor(rawIndexValue);
  let repaired = rawIndex > rawSteps.length || rawStepCount > 1000 || rawIndex !== rawIndexValue;
  const steps: LearningStep[] = [];
  const retryCounts = new Map<string, number>();
  let validBeforeIndex = 0;
  for (const [index, rawStep] of rawSteps.entries()) {
    let step: LearningStep | null;
    if (validStep(rawStep, context, entriesById)) {
      step = rawStep;
    } else {
      step = rebuildStep(rawStep, index, context, entriesById);
      repaired = true;
    }
    if (!step) continue;
    if (step.retry) {
      const count = retryCounts.get(step.contentId) ?? 0;
      if (count >= context.policy.maxPracticeRetries) {
        repaired = true;
        continue;
      }
      retryCounts.set(step.contentId, count + 1);
    }
    steps.push(step);
    if (index < rawIndex) validBeforeIndex++;
  }

  const index = Math.min(steps.length, Math.max(0, validBeforeIndex));
  if (index !== rawIndex) repaired = true;
  const now = context.now ?? Date.now();
  const completed = index >= steps.length;
  const rawEndedAt = isNumber(raw.endedAt) ? raw.endedAt : undefined;
  const rawEndReason = isEndReason(raw.endReason) ? raw.endReason : undefined;
  const activeMs = isNumber(raw.activeMs) ? raw.activeMs : 0;
  const overTimeLimit =
    !completed &&
    context.policy.timeLimitMs !== null &&
    activeMs >= context.policy.timeLimitMs;
  // A session the learner or the clock ended stays ended. Restoring must not
  // hand back a fresh queue the learner already chose to leave.
  const stopped =
    !completed &&
    !overTimeLimit &&
    rawEndedAt !== undefined &&
    (rawEndReason === "user-stopped" || rawEndReason === "time-limit");
  const finished = completed || overTimeLimit || stopped;
  const endedAt = finished ? (rawEndedAt ?? now) : undefined;
  const endReason = overTimeLimit
    ? "time-limit"
    : finished
      ? (rawEndReason ?? "completed")
      : undefined;
  if (rawEndedAt !== undefined || rawEndReason !== undefined || raw.endReason !== undefined) {
    // Half an end marker, or an end marker contradicted by the remaining
    // steps, is repaired rather than trusted.
    const consistent =
      finished && rawEndedAt !== undefined && rawEndReason !== undefined;
    if (!consistent) repaired = true;
  }
  if (overTimeLimit && rawEndReason !== "time-limit") repaired = true;

  const ids = new Set(entriesById.keys());
  const attempts: Record<string, LearningAttempt> = {};
  for (const [contentId, rawAttempt] of Object.entries(isObject(raw.attempts) ? raw.attempts : {})) {
    const attempt = sanitizeAttempt(rawAttempt);
    if (!attempt || attempt.contentId !== contentId || !ids.has(contentId)) continue;
    attempts[contentId] = attempt;
  }
  const practice = (Array.isArray(raw.practice) ? raw.practice : [])
    .map(sanitizeAttempt)
    .filter(
      (attempt): attempt is LearningAttempt =>
        !!attempt && attempt.kind !== "intro" && ids.has(attempt.contentId),
    )
    .map((attempt) => ({ ...attempt, first: false, counted: false, grade: null }))
    .slice(-1000);

  const retryPlans = sanitizeRetryPlans(raw.retryPlans, steps, context, entriesById);
  const rawCursor = isObject(raw.retryCursor) ? raw.retryCursor : {};
  const retryCursor: Record<string, number> = {};
  for (const [contentId, plans] of Object.entries(retryPlans)) {
    const cursor = rawCursor[contentId];
    const existingRetries = steps.filter(
      (step) => step.retry && step.contentId === contentId,
    ).length;
    const restored =
      typeof cursor === "number" && Number.isFinite(cursor)
        ? Math.floor(cursor)
        : 0;
    retryCursor[contentId] = Math.min(
      plans.length,
      Math.max(existingRetries, restored),
    );
  }

  // Retry steps are answered in order; practice records map to them by position.
  const answeredSteps: Record<number, true> = {};
  const seenRetry: Record<string, number> = {};
  for (const [stepIndex, step] of steps.entries()) {
    if (!step.retry) {
      if (step.kind !== "intro" && attempts[step.contentId]) answeredSteps[stepIndex] = true;
      continue;
    }
    const count = seenRetry[step.contentId] ?? 0;
    seenRetry[step.contentId] = count + 1;
    const practiceCount = practice.filter((attempt) => attempt.contentId === step.contentId).length;
    if (count < practiceCount) answeredSteps[stepIndex] = true;
  }

  const support = isSupport(raw.support) ? raw.support : "independent";
  const session: LearningSession = {
    version: 1,
    id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 120) : `learn-${now}`,
    courseId: context.courseId,
    contentVersion: context.contentVersion,
    policyId: context.policy.id,
    startedAt: isNumber(raw.startedAt) ? raw.startedAt : now,
    endedAt,
    endReason,
    timeLimitMs: context.policy.timeLimitMs,
    steps,
    index,
    attempts,
    practice,
    retryPlans,
    retryCursor,
    answeredSteps,
    support,
    introduced: sanitizeIdList(raw.introduced, ids),
    newIds: sanitizeIdList(raw.newIds, ids),
    reviewIds: sanitizeIdList(raw.reviewIds, ids),
    activeMs,
    // Restore is a fresh foreground moment: the time between saving and
    // reopening is offline, not study time. Without this reset the first tick
    // would add the closed-page gap (up to the 5-minute activity cap).
    lastTickAt: now,
    stepStartedAt: now,
    stepActiveMs: isNumber(raw.stepActiveMs)
      ? Math.min(activeMs, raw.stepActiveMs)
      : activeMs,
    visible: typeof raw.visible === "boolean" ? raw.visible : true,
  };
  return {
    status: repaired ? "repaired" : "ok",
    session,
    preservedAttempts: preservedAttempts.length
      ? preservedAttempts
      : Object.values(attempts),
  };
}
