import type {
  AttemptResult,
  AttemptSupport,
  LearningEntry,
} from "../courses/types";
import type { Grade } from "../store/srs";
import { normalize, shuffle } from "../lib/text";
import type { LearningPolicy, PolicyId } from "./policy";
import { policyById } from "./policy";
import {
  buildQuestion,
  questionTypes,
  type QuestionKind,
} from "./questions";
import {
  resourceErrorResult,
  scoreAttempt,
  skippedResult,
} from "./scoring";

export type SessionEndReason = "completed" | "time-limit" | "user-stopped";
export type StepKind = "intro" | QuestionKind;

export interface LearningStep {
  contentId: string;
  kind: StepKind;
  /** Content IDs for tap answers, including the correct target. */
  options?: string[];
  /** Expected typed answer for spelling-style questions. */
  expected?: string;
  retry?: boolean;
}

export interface LearningAttempt {
  contentId: string;
  kind: StepKind;
  result: AttemptResult;
  first: boolean;
  counted: boolean;
  grade: Grade | null;
  elapsedMs: number;
  at: number;
  activeMs: number;
}

export interface LearningSession {
  version: 1;
  id: string;
  courseId: string;
  contentVersion: string;
  policyId: PolicyId;
  startedAt: number;
  endedAt?: number;
  endReason?: SessionEndReason;
  /** Foreground active time limit captured at creation time. */
  timeLimitMs: number | null;
  steps: LearningStep[];
  index: number;
  /** First outcome per content item. Retries never replace this record. */
  attempts: Record<string, LearningAttempt>;
  /** Practice retries, kept separate so they never touch accuracy. */
  practice: LearningAttempt[];
  /** Pre-built alternative formats. No pool is needed when a retry is inserted. */
  retryPlans: Record<string, LearningStep[]>;
  retryCursor: Record<string, number>;
  /** Indices whose current retry step already received an answer/skip. */
  answeredSteps: Record<number, true>;
  support: AttemptSupport;
  introduced: string[];
  newIds: string[];
  reviewIds: string[];
  activeMs: number;
  lastTickAt: number;
  stepStartedAt: number;
  /** Foreground active time when the current step opened. */
  stepActiveMs: number;
  visible: boolean;
}

export interface CreateSessionInput {
  courseId: string;
  contentVersion: string;
  policy: LearningPolicy;
  /** All entries that may be used as distractors. */
  pool: readonly LearningEntry[];
  due: readonly LearningEntry[];
  fresh: readonly LearningEntry[];
  requestedNewCount?: number;
  now: number;
  seed: number;
  visible?: boolean;
  /** Caregiver co-reading: introduce entries but never grade a recall. */
  introOnly?: boolean;
}

export type LearningAction =
  | { type: "answer"; at: number; optionId?: string; value?: string }
  | { type: "support"; at: number; support: Exclude<AttemptSupport, "independent"> }
  | { type: "skip"; at: number }
  | { type: "resource-error"; at: number }
  | { type: "next"; at: number }
  | { type: "tick"; at: number; visible: boolean }
  | { type: "stop"; at: number };

const MAX_ACTIVITY_DELTA = 5 * 60_000;

export function currentStep(session: LearningSession): LearningStep | undefined {
  return session.steps[session.index];
}

function uniqueById(entries: readonly LearningEntry[]): LearningEntry[] {
  const seen = new Set<string>();
  const out: LearningEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
  }
  return out;
}

export function buildRetryPlans(
  target: LearningEntry,
  pool: readonly LearningEntry[],
  policy: LearningPolicy,
  seed: number,
  firstKind: QuestionKind,
): LearningStep[] {
  const used = new Set<QuestionKind>([firstKind]);
  const plans: LearningStep[] = [];
  const maxRetries = Math.max(0, Math.floor(policy.maxPracticeRetries));
  for (let i = 0; i < maxRetries; i++) {
    const plan = buildQuestion(target, pool, policy, seed + 101 + i, {
      excludeKinds: [...used],
    });
    if (!plan) break;
    plans.push({
      contentId: target.id,
      kind: plan.kind,
      options: plan.options,
      expected: plan.expected,
      retry: true,
    });
    used.add(plan.kind);
  }
  return plans;
}

function questionStep(
  target: LearningEntry,
  pool: readonly LearningEntry[],
  policy: LearningPolicy,
  seed: number,
): { step: LearningStep; plans: LearningStep[] } | null {
  const plan = buildQuestion(target, pool, policy, seed);
  if (!plan) return null;
  return {
    step: {
      contentId: target.id,
      kind: plan.kind,
      options: plan.options,
      expected: plan.expected,
    },
    plans: buildRetryPlans(target, pool, policy, seed, plan.kind),
  };
}

/**
 * Build a bounded session. Due reviews are capped before new content is added,
 * so an overdue backlog ends normally instead of growing an endless queue.
 */
export function createLearningSession(input: CreateSessionInput): LearningSession {
  const { policy, now, seed } = input;
  const requested = Number.isFinite(input.requestedNewCount)
    ? (input.requestedNewCount as number)
    : policy.newContentLimit;
  const newLimit = Math.max(0, Math.min(policy.newContentLimit, Math.floor(requested)));
  const due = uniqueById(input.due).slice(0, policy.reviewLimit);
  const fresh = uniqueById(input.fresh).slice(0, newLimit);
  const seen = new Set<string>();
  const steps: LearningStep[] = [];
  const retryPlans: Record<string, LearningStep[]> = {};
  const reviewIds: string[] = [];

  for (const [index, entry] of due.entries()) {
    if (seen.has(entry.id)) continue;
    const built = questionStep(entry, input.pool, policy, seed + index);
    if (!built) continue;
    seen.add(entry.id);
    steps.push(built.step);
    retryPlans[entry.id] = built.plans;
    reviewIds.push(entry.id);
  }

  const newIds: string[] = [];
  const introGroupSize = Math.max(1, Math.floor(policy.introGroupSize) || 1);
  for (let groupStart = 0; groupStart < fresh.length; groupStart += introGroupSize) {
    const group = fresh.slice(groupStart, groupStart + introGroupSize);
    const groupId = seed + 1000 + groupStart;
    for (const entry of group) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      steps.push({ contentId: entry.id, kind: "intro" });
      newIds.push(entry.id);
    }
    if (input.introOnly) continue;
    for (const [index, entry] of shuffle(group, groupId).entries()) {
      if (!newIds.includes(entry.id)) continue;
      const built = questionStep(entry, input.pool, policy, groupId + 200 + index);
      if (!built) continue;
      steps.push(built.step);
      retryPlans[entry.id] = built.plans;
    }
  }

  const session: LearningSession = {
    version: 1,
    id: `learn-${Math.floor(seed)}`,
    courseId: input.courseId,
    contentVersion: input.contentVersion,
    policyId: policy.id,
    startedAt: now,
    timeLimitMs: policy.timeLimitMs,
    steps,
    index: 0,
    attempts: {},
    practice: [],
    retryPlans,
    retryCursor: {},
    answeredSteps: {},
    support: "independent",
    introduced: [],
    newIds,
    reviewIds,
    activeMs: 0,
    lastTickAt: now,
    stepStartedAt: now,
    stepActiveMs: 0,
    visible: input.visible ?? true,
  };
  if (!steps.length) return { ...session, endedAt: now, endReason: "completed" };
  return session;
}

function accumulate(
  session: LearningSession,
  at: number,
  visible: boolean,
): LearningSession {
  if (session.endedAt) return session;
  // The last observed visibility covers the interval ending at this event: a
  // hidden event arrives while the page is still foreground, so that segment
  // counts; the following background gap does not.
  const delta = session.visible
    ? Math.max(0, Math.min(MAX_ACTIVITY_DELTA, at - session.lastTickAt))
    : 0;
  const activeMs = session.activeMs + (Number.isFinite(delta) ? delta : 0);
  const next: LearningSession = {
    ...session,
    activeMs,
    lastTickAt: at,
    visible,
  };
  if (next.timeLimitMs !== null && activeMs >= next.timeLimitMs) {
    return { ...next, endedAt: at, endReason: "time-limit" };
  }
  return next;
}

function activityForAction(session: LearningSession, at: number): LearningSession {
  return accumulate(session, at, session.visible);
}

function attemptRecord(
  step: LearningStep,
  result: AttemptResult,
  at: number,
  activeMs: number,
  elapsedMs: number,
  scored?: { grade: Grade | null; counted: boolean; first: boolean },
): LearningAttempt {
  return {
    contentId: step.contentId,
    kind: step.kind,
    result,
    first: scored?.first ?? false,
    counted: scored?.counted ?? false,
    grade: scored?.grade ?? null,
    elapsedMs,
    at,
    activeMs,
  };
}

function advance(session: LearningSession, at: number): LearningSession {
  let index = session.index + 1;
  while (index < session.steps.length) {
    const step = session.steps[index];
    if (step.kind === "intro") {
      // An intro is done once the child met it, or skipped it: a skipped intro
      // must not resurface and must not lead into a graded recall.
      if (
        session.introduced.includes(step.contentId) ||
        session.attempts[step.contentId]
      ) {
        index++;
        continue;
      }
    } else if (!step.retry) {
      const attempt = session.attempts[step.contentId];
      if (attempt) {
        index++;
        continue;
      }
    }
    break;
  }
  const next: LearningSession = {
    ...session,
    index,
    support: "independent",
    stepStartedAt: at,
    stepActiveMs: session.activeMs,
  };
  if (index >= session.steps.length)
    return { ...next, endedAt: at, endReason: "completed" };
  return next;
}

function scheduleRetry(
  session: LearningSession,
  step: LearningStep,
  at: number,
): LearningSession {
  const plans = session.retryPlans[step.contentId] ?? [];
  const cursor = session.retryCursor[step.contentId] ?? 0;
  const plan = plans[cursor];
  if (!plan) return session;
  const steps = [...session.steps];
  const insertAt = Math.min(steps.length, session.index + 4);
  steps.splice(insertAt, 0, { ...plan });
  return {
    ...session,
    steps,
    retryCursor: { ...session.retryCursor, [step.contentId]: cursor + 1 },
    stepStartedAt: at,
  };
}

function answerCorrect(
  step: LearningStep,
  optionId: string | undefined,
  value: string | undefined,
): boolean | null {
  const definition = questionTypes[step.kind as QuestionKind];
  if (!definition) return null;
  if (definition.input) {
    if (typeof value !== "string" || !value.trim() || !step.expected) return null;
    return normalize(value) === normalize(step.expected);
  }
  if (typeof optionId !== "string" || !step.options?.includes(optionId)) return null;
  return optionId === step.contentId;
}

function answer(
  session: LearningSession,
  action: Extract<LearningAction, { type: "answer" }>,
): LearningSession {
  const step = currentStep(session);
  if (!step || step.kind === "intro") return session;
  const definition = questionTypes[step.kind];
  if (!definition) return session;

  if (session.answeredSteps[session.index]) return session;
  if (!step.retry && session.attempts[step.contentId]) return session;

  const correct = answerCorrect(step, action.optionId, action.value);
  if (correct === null) return session;

  const elapsedMs = Math.max(0, session.activeMs - session.stepActiveMs);
  const first = !step.retry;
  const activeMs = session.activeMs;
  if (first) {
    const policy = policyById(session.policyId);
    if (!policy) return session;
    const scored = scoreAttempt(
      {
        contentId: step.contentId,
        kind: step.kind,
        correct,
        support: session.support,
        elapsedMs,
        firstValid: true,
      },
      policy,
    );
    const attempt = attemptRecord(
      step,
      scored.result,
      action.at,
      activeMs,
      elapsedMs,
      { grade: scored.grade, counted: scored.counted, first: true },
    );
    let next: LearningSession = {
      ...session,
      attempts: { ...session.attempts, [step.contentId]: attempt },
      answeredSteps: { ...session.answeredSteps, [session.index]: true },
    };
    if (!correct && scored.counted) next = scheduleRetry(next, step, action.at);
    return next;
  }

  const result: AttemptResult = {
    outcome: "answered",
    contentId: step.contentId,
    correct,
    support: session.support,
  };
  const practice = attemptRecord(step, result, action.at, activeMs, elapsedMs, {
    grade: null,
    counted: false,
    first: false,
  });
  let next: LearningSession = {
    ...session,
    practice: [...session.practice, practice].slice(-1000),
    answeredSteps: { ...session.answeredSteps, [session.index]: true },
  };
  if (!correct) next = scheduleRetry(next, step, action.at);
  return next;
}

function skip(session: LearningSession, at: number): LearningSession {
  const step = currentStep(session);
  if (!step) return session;
  if (step.retry) {
    if (session.answeredSteps[session.index]) return advance(session, at);
    const attempt = attemptRecord(
      step,
      skippedResult(step.contentId),
      at,
      session.activeMs,
      0,
      { grade: null, counted: false, first: false },
    );
    return advance(
      {
        ...session,
        practice: [...session.practice, attempt].slice(-1000),
        answeredSteps: { ...session.answeredSteps, [session.index]: true },
      },
      at,
    );
  }
  if (session.attempts[step.contentId]) return advance(session, at);
  const attempt = attemptRecord(
    step,
    skippedResult(step.contentId),
    at,
    session.activeMs,
    0,
    { grade: null, counted: false, first: step.kind !== "intro" },
  );
  return advance(
    {
      ...session,
      attempts: { ...session.attempts, [step.contentId]: attempt },
      answeredSteps: { ...session.answeredSteps, [session.index]: true },
    },
    at,
  );
}

function resourceError(session: LearningSession, at: number): LearningSession {
  const step = currentStep(session);
  if (!step || step.kind === "intro") return session;
  if (session.answeredSteps[session.index]) return session;
  if (step.retry) {
    if (session.answeredSteps[session.index]) return session;
    const attempt = attemptRecord(
      step,
      resourceErrorResult(step.contentId),
      at,
      session.activeMs,
      0,
      { grade: null, counted: false, first: false },
    );
    return advance(
      {
        ...session,
        practice: [...session.practice, attempt].slice(-1000),
        answeredSteps: { ...session.answeredSteps, [session.index]: true },
      },
      at,
    );
  }
  const attempt = attemptRecord(
    step,
    resourceErrorResult(step.contentId),
    at,
    session.activeMs,
    0,
    { grade: null, counted: false, first: true },
  );
  return advance(
    {
      ...session,
      attempts: { ...session.attempts, [step.contentId]: attempt },
      answeredSteps: { ...session.answeredSteps, [session.index]: true },
    },
    at,
  );
}

function next(session: LearningSession, at: number): LearningSession {
  const step = currentStep(session);
  if (!step) return session;
  if (step.kind === "intro") {
    const introduced = session.introduced.includes(step.contentId)
      ? session.introduced
      : [...session.introduced, step.contentId];
    return advance({ ...session, introduced }, at);
  }
  if (step.retry) {
    return session.answeredSteps[session.index] ? advance(session, at) : session;
  }
  if (!session.attempts[step.contentId] && !session.answeredSteps[session.index])
    return session;
  return advance(session, at);
}

export function learningReducer(
  session: LearningSession,
  action: LearningAction,
): LearningSession {
  if (session.endedAt) return session;
  if (action.type === "stop") {
    const active = accumulate(session, action.at, session.visible);
    if (active.endedAt) return active;
    return { ...active, endedAt: action.at, endReason: "user-stopped" };
  }
  if (action.type === "tick") return accumulate(session, action.at, action.visible);

  const active = activityForAction(session, action.at);
  if (active.endedAt) return active;

  switch (action.type) {
    case "answer":
      return answer(active, action);
    case "support": {
      const step = currentStep(active);
      if (!step || step.kind === "intro") return active;
      if (active.attempts[step.contentId] || active.answeredSteps[active.index]) return active;
      const policy = policyById(active.policyId);
      if (!policy?.supports.includes(action.support)) return active;
      return { ...active, support: action.support };
    }
    case "skip":
      return skip(active, action.at);
    case "resource-error":
      return resourceError(active, action.at);
    case "next":
      return next(active, action.at);
  }
}

export function learningSessionStats(session: LearningSession) {
  const attempts = Object.values(session.attempts);
  const answered = attempts.filter((attempt) => attempt.result.outcome === "answered");
  const independent = answered.filter(
    (attempt) =>
      attempt.result.outcome === "answered" &&
      attempt.result.correct &&
      attempt.result.support === "independent",
  ).length;
  const supported = answered.filter(
    (attempt) =>
      attempt.result.outcome === "answered" &&
      attempt.result.correct &&
      attempt.result.support !== "independent",
  ).length;
  return {
    introduced: session.introduced.length,
    independent,
    supported,
    skipped: attempts.filter((attempt) => attempt.result.outcome === "skipped").length,
    resourceErrors: attempts.filter(
      (attempt) => attempt.result.outcome === "resource-error",
    ).length,
    retries: session.practice.length,
    activeMs: session.activeMs,
  };
}
