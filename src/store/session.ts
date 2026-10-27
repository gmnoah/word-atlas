import type { Atlas, WordRef } from "../atlas/types";
import { MEDIA } from "../atlas/types";
import { hashSeed, normalize, shuffle } from "../lib/text";
import { IELTS_POLICY, ieltsPolicyFromSettings } from "../learning/policy";
import { gradeForPolicy } from "../learning/scoring";
import { isMastered, review, Rating, type Grade } from "./srs";
import { bumpDay, dayKey, store, type ActiveSession, type Progress, type QuizKind, type Settings, type Step } from "./store";

export function dueIds(p: Progress, now = Date.now()) {
  return Object.entries(p.cards)
    .filter(([, c]) => c.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id);
}

export function newToday(p: Progress) {
  return p.days[dayKey()]?.n ?? 0;
}

/** Next unseen words along the learning path, starting at the learner's level. */
export function nextNew(atlas: Atlas, p: Progress, settings: Settings, count: number) {
  const out: string[] = [];
  const pass = (from: number) => {
    for (const w of atlas.words) {
      if (out.length >= count) return;
      if (w.cefr < from || p.cards[w.id] || out.includes(w.id)) continue;
      out.push(w.id);
    }
  };
  pass(settings.startLevel);
  if (out.length < count) pass(0);
  return out;
}

export function todayPlan(atlas: Atlas, p: Progress, s: Settings) {
  const due = dueIds(p).filter((id) => atlas.byId.has(id));
  const newLeft = Math.max(0, s.dailyNew - newToday(p));
  const fresh = nextNew(atlas, p, s, newLeft);
  return { due, fresh, minutes: Math.max(1, Math.round(due.length * 0.25 + fresh.length * 0.9)) };
}

function quizKind(ref: WordRef, p: Progress, s: Settings, salt: number): QuizKind {
  const c = p.cards[ref.id];
  const hasImg = !!(ref.media & MEDIA.img);
  const hasAudio = !!(ref.media & (MEDIA.uk | MEDIA.us));
  const roll = hashSeed(ref.id + salt) % 100;
  if (!c || c.s < 2) {
    if (hasImg && roll < 45) return "picture";
    if (roll < 80 || !hasAudio) return "meaning";
    return "listen";
  }
  if (s.spell && (c.s >= 4 || roll < 35))
    return roll < 75 ? "spell" : hasImg ? "picture" : hasAudio ? "listen" : "meaning";
  if (roll < 50) return hasAudio ? "listen" : "meaning";
  return hasImg ? "picture" : "meaning";
}

/** Distractors that look plausible: same level, similar spelling or length, different meaning. */
export function distractors(atlas: Atlas, ref: WordRef, kind: QuizKind, seed: number) {
  const target = normalize(ref.word);
  const zhCore = ref.zh.replace(/^[a-z.]+\s*/, "").split(/[；;，,]/)[0];
  const scored: [number, WordRef][] = [];
  const pool = atlas.words;
  const start = Math.max(0, ref.order - 400);
  for (let i = start; i < Math.min(pool.length, ref.order + 400); i++) {
    const w = pool[i];
    if (w.id === ref.id || normalize(w.word) === target) continue;
    if (zhCore && w.zh.includes(zhCore)) continue;
    let score = hashSeed(w.id + seed) % 100;
    if (kind === "listen" || kind === "picture") {
      if (w.word[0]?.toLowerCase() === target[0]) score += 120;
      score += Math.max(0, 60 - Math.abs(w.word.length - target.length) * 20);
    } else {
      if (w.cefr === ref.cefr) score += 40;
      if (w.zh.split(" ")[0] === ref.zh.split(" ")[0]) score += 60; // same part of speech
    }
    scored.push([score, w]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const seen = new Set<string>();
  const picks: string[] = [];
  for (const [, w] of scored) {
    const key = kind === "meaning" ? w.zh : normalize(w.word);
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(w.id);
    if (picks.length === 3) break;
  }
  return shuffle([ref.id, ...picks], seed);
}

export function buildSession(atlas: Atlas, p: Progress, s: Settings, opts?: { ids?: string[]; reviewOnly?: boolean }): ActiveSession {
  const seed = Date.now();
  const plan = todayPlan(atlas, p, s);
  const reviewIds = opts?.ids ? opts.ids.filter((id) => p.cards[id]) : plan.due.slice(0, 120);
  const newIds = opts?.ids ? opts.ids.filter((id) => !p.cards[id]) : opts?.reviewOnly ? [] : plan.fresh;
  const steps: Step[] = [];
  const quiz = (id: string, salt: number): Step | null => {
    const ref = atlas.byId.get(id);
    if (!ref) return null;
    const kind = quizKind(ref, p, s, seed + salt);
    const options = kind === "spell" ? undefined : distractors(atlas, ref, kind, seed + salt);
    if (kind !== "spell" && (!options || options.length < 2)) return null;
    return { id, kind, options };
  };
  // Reviews first while attention is fresh, then new words in small groups:
  // meet five, then recall those five in a different order.
  const playableReviews: string[] = [];
  reviewIds.forEach((id, i) => {
    const step = quiz(id, i);
    if (!step) return;
    steps.push(step);
    playableReviews.push(id);
  });
  const playableNew: string[] = [];
  for (let g = 0; g < newIds.length; g += 5) {
    const group = newIds.slice(g, g + 5);
    const planned = group
      .map((id, i) => ({ id, step: quiz(id, 1000 + g + i) }))
      .filter((item): item is { id: string; step: Step } => !!item.step);
    planned.forEach(({ id }) => steps.push({ id, kind: "intro" }));
    shuffle(planned, seed + g).forEach(({ step }) => steps.push(step));
    playableNew.push(...planned.map(({ id }) => id));
  }
  return { id: `s${seed}`, started: seed, steps, index: 0, graded: {}, newIds: playableNew, reviewIds: playableReviews, contentVersion: atlas.manifest.version };
}

export function gradeFor(kind: QuizKind, correct: boolean, ms: number, hinted: boolean): Grade {
  return gradeForPolicy(
    kind,
    correct,
    ms,
    hinted ? "hinted" : "independent",
    IELTS_POLICY,
  );
}

const LEGACY_QUIZ_KINDS = new Set<QuizKind>(["meaning", "picture", "listen", "spell"]);

/**
 * Retry formats follow the same policy and media rules as a normal question.
 * If no alternative can be built, no retry is inserted.
 */
export function eligibleRetryKind(
  ref: WordRef,
  current: QuizKind,
  allowed: readonly string[],
): QuizKind | null {
  for (const candidate of allowed) {
    if (!LEGACY_QUIZ_KINDS.has(candidate as QuizKind)) continue;
    const kind = candidate as QuizKind;
    if (kind === current || kind === "spell") continue;
    if (kind === "picture" && !(ref.media & MEDIA.img)) continue;
    if (kind === "listen" && !(ref.media & (MEDIA.uk | MEDIA.us))) continue;
    return kind;
  }
  return null;
}

/** Apply an answer. Only the first attempt for a word in a session updates memory and stats. */
export function answer(atlas: Atlas, step: Step & { kind: QuizKind }, correct: boolean, grade: Grade, value: string) {
  const { settings } = store.get();
  store.progress((p) => {
    const sess = p.session;
    if (!sess) return p;
    let next: Progress = { ...p, session: { ...sess, pending: { correct, value } } };
    const first = !(step.id in sess.graded) && !step.retry;
    if (first) {
      next = {
        ...next,
        cards: { ...next.cards, [step.id]: review(p.cards[step.id], grade, Date.now(), settings.retention) },
        session: { ...next.session!, graded: { ...sess.graded, [step.id]: grade } },
        mistakes: correct ? next.mistakes : [step.id, ...next.mistakes.filter((x) => x !== step.id)].slice(0, 300),
      };
      next = bumpDay(next, { r: 1, c: correct ? 1 : 0, n: sess.newIds.includes(step.id) ? 1 : 0 });
    }
    if (!correct) {
      // Practise it again a few steps later in another eligible format; never re-graded.
      const steps = [...next.session!.steps];
      const retries = steps.filter((x) => x.id === step.id && "retry" in x && x.retry).length;
      const policy = ieltsPolicyFromSettings(settings);
      if (retries < policy.maxPracticeRetries) {
        const ref = atlas.byId.get(step.id)!;
        const kind = eligibleRetryKind(ref, step.kind, policy.allowedKinds);
        const options = kind ? distractors(atlas, ref, kind, Date.now()) : [];
        if (kind && options.length >= policy.minOptions) {
          const at = Math.min(steps.length, sess.index + 4);
          steps.splice(at, 0, { id: step.id, kind, retry: true, options });
          next = { ...next, session: { ...next.session!, steps } };
        }
      }
    }
    return next;
  });
}

/** Move to the next step; `seconds` is time spent on this step, capped so idle tabs don't inflate stats. */
export function advance(seconds: number) {
  store.progress((p) => {
    const s = p.session;
    if (!s) return p;
    const index = s.index + 1;
    const finished = index >= s.steps.length ? Date.now() : undefined;
    const next = bumpDay(p, { t: Math.max(0, Math.min(90, Math.round(seconds))) });
    return { ...next, session: { ...s, index, pending: undefined, finished } };
  });
}

export function sessionStats(s: ActiveSession) {
  const graded = Object.values(s.graded);
  const correct = graded.filter((g) => g !== Rating.Again).length;
  return { total: graded.length, correct, accuracy: graded.length ? Math.round((correct / graded.length) * 100) : 0 };
}

export const masteredCount = (p: Progress) => Object.values(p.cards).filter(isMastered).length;

function usableLegacyStep(atlas: Atlas, step: Step): boolean {
  const ref = atlas.byId.get(step.id);
  if (!ref) return false;
  if (step.kind === "intro" || step.kind === "spell") return true;
  if (step.kind === "picture" && !(ref.media & MEDIA.img)) return false;
  if (step.kind === "listen" && !(ref.media & (MEDIA.uk | MEDIA.us))) return false;
  return (
    Array.isArray(step.options) &&
    step.options.length >= 2 &&
    new Set(step.options).size === step.options.length &&
    step.options.includes(step.id) &&
    step.options.every((id) => atlas.byId.has(id))
  );
}

/**
 * Repair a restored session against the currently loaded atlas. Missing
 * references are dropped, damaged future questions are rebuilt from current
 * content, and already answered history stays intact.
 */
export function reconcileSession(
  atlas: Atlas,
  session: ActiveSession,
  p: Progress,
  settings: Settings,
): ActiveSession | null {
  const versionMismatch =
    !!session.contentVersion && session.contentVersion !== atlas.manifest.version;
  const seed = session.started || Date.now();
  const buildQuiz = (id: string, salt: number, retry: boolean): Step | null => {
    const ref = atlas.byId.get(id);
    if (!ref) return null;
    let kind = quizKind(ref, p, settings, seed + salt);
    // A retry practices a word already met; spelling is not a practice format.
    if (retry && kind === "spell") {
      kind = ref.media & MEDIA.img ? "picture" : ref.media & (MEDIA.uk | MEDIA.us) ? "listen" : "meaning";
    }
    const options = kind === "spell" ? undefined : distractors(atlas, ref, kind, seed + salt);
    if (kind !== "spell" && (!options || options.length < 2)) return null;
    return { id, kind, options };
  };
  const rebuild = (step: Step, index: number): Step | null => {
    // Keep the learning semantics of the original step. A "meet the word" page
    // must never become a graded question just because content changed.
    if (!atlas.byId.has(step.id)) return null;
    if (step.kind === "intro") return { id: step.id, kind: "intro" };
    const retry = "retry" in step && step.retry === true;
    const next = buildQuiz(step.id, index, retry);
    if (!next) return null;
    return retry ? ({ ...next, retry: true } as Step) : next;
  };

  const steps: Step[] = [];
  let removedBeforeIndex = 0;
  let changed = versionMismatch || !session.contentVersion;
  let currentStepUnchanged = true;
  for (const [index, step] of session.steps.entries()) {
    const forceRebuild = versionMismatch && index >= session.index;
    let next: Step | null = step;
    if (forceRebuild || !usableLegacyStep(atlas, step)) {
      next = rebuild(step, index);
      changed = true;
    }
    if (!next) {
      if (index === session.index) currentStepUnchanged = false;
      if (index < session.index) removedBeforeIndex++;
      continue;
    }
    if (index === session.index && next !== step) currentStepUnchanged = false;
    steps.push(next);
  }

  const index = Math.max(0, Math.min(steps.length, session.index - removedBeforeIndex));
  if (index !== session.index) changed = true;
  if (!steps.length) return null;

  const ids = new Set(steps.map((step) => step.id));
  const graded = Object.fromEntries(
    Object.entries(session.graded).filter(([id]) => ids.has(id)),
  ) as ActiveSession["graded"];
  const newIds = session.newIds.filter((id) => atlas.byId.has(id));
  const reviewIds = session.reviewIds.filter((id) => atlas.byId.has(id));
  const pending =
    currentStepUnchanged &&
    index < steps.length &&
    steps[index].id === session.steps[session.index]?.id
      ? session.pending
      : undefined;
  const finished = index >= steps.length ? (session.finished ?? Date.now()) : undefined;
  if (!changed && pending === session.pending && finished === session.finished) return session;

  return {
    ...session,
    steps,
    index,
    graded,
    newIds,
    reviewIds,
    pending,
    finished,
    contentVersion: atlas.manifest.version,
  };
}
