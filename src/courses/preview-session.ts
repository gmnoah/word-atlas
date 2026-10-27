import { hashSeed, shuffle } from "../lib/text";
import type { AttemptResult, LearningEntry } from "./types";

export interface PreviewStep {
  entryId: string;
  kind: "intro" | "recall";
  options: string[];
}
export interface PreviewSession {
  steps: PreviewStep[];
  index: number;
  introduced: string[];
  results: Record<string, AttemptResult>;
  support: "independent" | "hinted" | "assisted";
  resourceFailed: boolean;
}
export type PreviewAction =
  | { type: "next" }
  | { type: "answer"; optionId: string }
  | { type: "support"; support: "hinted" | "assisted" }
  | { type: "skip" }
  | { type: "resource-error" };

export function createPreviewSession(
  entries: LearningEntry[],
  count: number,
  seed: number,
): PreviewSession {
  const selected = entries.slice(
    0,
    Math.max(
      1,
      Math.min(entries.length, Number.isFinite(count) ? Math.floor(count) : 3),
    ),
  );
  const intros: PreviewStep[] = selected.map((e) => ({
    entryId: e.id,
    kind: "intro",
    options: [],
  }));
  const recalls: PreviewStep[] =
    selected.length < 2
      ? []
      : shuffle(selected, seed).map((e) => ({
          entryId: e.id,
          kind: "recall",
          options: shuffle(
            [
              e.id,
              ...shuffle(
                selected.filter((x) => x.id !== e.id),
                seed + hashSeed(e.id),
              )
                .slice(0, 1)
                .map((x) => x.id),
            ],
            seed + hashSeed(e.id),
          ),
        }));
  return {
    steps: [...intros, ...recalls],
    index: 0,
    introduced: [],
    results: {},
    support: "independent",
    resourceFailed: false,
  };
}

function advance(session: PreviewSession): PreviewSession {
  let index = session.index + 1;
  while (
    index < session.steps.length &&
    session.results[session.steps[index].entryId]?.outcome === "skipped"
  )
    index++;
  return { ...session, index, support: "independent", resourceFailed: false };
}

/** Preview-only reducer. No storage or FSRS mutations. */
export function previewReducer(
  session: PreviewSession,
  action: PreviewAction,
): PreviewSession {
  const step = session.steps[session.index];
  if (!step) return session;
  const result = session.results[step.entryId];
  if (action.type === "resource-error")
    return { ...session, resourceFailed: true };
  if (action.type === "support")
    return result ? session : { ...session, support: action.support };
  if (action.type === "answer") {
    if (
      step.kind !== "recall" ||
      result ||
      session.resourceFailed ||
      !step.options.includes(action.optionId)
    )
      return session;
    return {
      ...session,
      results: {
        ...session.results,
        [step.entryId]: {
          outcome: "answered",
          contentId: step.entryId,
          correct: action.optionId === step.entryId,
          support: session.support,
        },
      },
    };
  }
  if (action.type === "skip") {
    if (result) return advance(session);
    return advance({
      ...session,
      results: {
        ...session.results,
        [step.entryId]: { outcome: "skipped", contentId: step.entryId },
      },
    });
  }
  if (step.kind === "intro") {
    return advance({
      ...session,
      introduced: [...new Set([...session.introduced, step.entryId])],
    });
  }
  return result ? advance(session) : session;
}

export function previewStats(session: PreviewSession) {
  const results = Object.values(session.results);
  return {
    introduced: session.introduced.length,
    independent: results.filter(
      (r) =>
        r.outcome === "answered" && r.correct && r.support === "independent",
    ).length,
    supported: results.filter(
      (r) => r.outcome === "answered" && r.support !== "independent",
    ).length,
    skipped: results.filter((r) => r.outcome === "skipped").length,
  };
}
