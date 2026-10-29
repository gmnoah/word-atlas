import type { LearningEntry } from "./types";
import { PRIMARY_ADVANCED_POLICY, PRIMARY_STARTER_POLICY } from "../learning/policy";

export type PrimaryStartingStage = "starter" | "advanced";

/** Spelling is opt-in and never available in the starter stage. */
export function primaryVisualPolicy(stage: PrimaryStartingStage, spelling = false) {
  return {
    ...(stage === "starter" ? PRIMARY_STARTER_POLICY : PRIMARY_ADVANCED_POLICY),
    allowedKinds: stage === "advanced" && spelling
      ? ["listen-picture", "picture-word", "listen-word", "spell"] as const
      : ["listen-picture", "picture-word", "listen-word"] as const,
  };
}

/** Reorder a theme cyclically so even its last item can be a starting point. */
export function entriesFromStartingPoint(
  entries: readonly LearningEntry[],
  startId?: string,
): LearningEntry[] {
  const index = entries.findIndex((entry) => entry.id === startId);
  const start = index < 0 ? 0 : index;
  return [...entries.slice(start), ...entries.slice(0, start)];
}

/** The starting stage limits this preview only; it does not claim proficiency. */
export function primaryPreviewCount(requested: number, stage: PrimaryStartingStage): number {
  const safe = Number.isFinite(requested) ? Math.max(1, Math.floor(requested)) : 3;
  return Math.min(safe, primaryVisualPolicy(stage).newContentLimit);
}

/** Keep familiar, concrete sample themes first without hiding other course entries. */
export function recommendedPrimaryEntries(
  entries: readonly LearningEntry[],
  lessons: readonly { id: string; entryIds: readonly string[] }[],
): LearningEntry[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const seen = new Set<string>();
  const result: LearningEntry[] = [];
  const append = (entry: LearningEntry | undefined) => {
    if (entry && !seen.has(entry.id)) { seen.add(entry.id); result.push(entry); }
  };
  for (const lessonId of ["fruit", "animals", "nature", "school", "breakfast", "home"]) {
    const lesson = lessons.find((item) => item.id === lessonId);
    for (const id of lesson?.entryIds ?? []) append(byId.get(id));
  }
  for (const entry of entries) append(entry);
  return result;
}
