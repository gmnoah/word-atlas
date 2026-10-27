import { restoreLearningSession } from "../learning/persistence";
import type { LearningSession } from "../learning/session";
import type { LearningEntry } from "./types";
import { primaryVisualPolicy, type PrimaryStartingStage } from "./starting-point";

type Storage = Pick<StorageLike, "getItem" | "setItem" | "removeItem">;
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface Checkpoint { version: 1; profileId: string; courseId: string; lessonId: string; stage: PrimaryStartingStage; spellingEnabled: boolean; session: LearningSession }
const validId = (id: string) => /^[a-z0-9_-]{1,80}$/i.test(id);
export function checkpointKey(profileId: string, courseId: string, lessonId: string) {
  if (![profileId, courseId, lessonId].every(validId)) throw new Error("Invalid checkpoint scope");
  return `word-atlas:v3:primary-session:${profileId}:${courseId}:${lessonId}`;
}

/** Reject bad or incompatible saved sessions, leaving the original bytes untouched. */
export function readCheckpoint(storage: Storage, scope: { profileId: string; courseId: string; lessonId: string; contentVersion: string; entries: LearningEntry[] }, now: number):
  { status: "empty"; raw: null } | { status: "ok"; raw: string; checkpoint: Checkpoint } | { status: "invalid"; raw: string | null } {
  let raw: string | null = null;
  try {
    raw = storage.getItem(checkpointKey(scope.profileId, scope.courseId, scope.lessonId));
    if (raw === null) return { status: "empty", raw };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", raw };
    const saved = value as Record<string, unknown>;
    if (saved.version !== 1 || saved.profileId !== scope.profileId || saved.courseId !== scope.courseId || saved.lessonId !== scope.lessonId ||
      (saved.stage !== "starter" && saved.stage !== "advanced") || typeof saved.spellingEnabled !== "boolean" ||
      (saved.stage === "starter" && saved.spellingEnabled)) return { status: "invalid", raw };
    const restored = restoreLearningSession(saved.session, { courseId: scope.courseId, contentVersion: scope.contentVersion,
      policy: primaryVisualPolicy(saved.stage, saved.spellingEnabled), entries: scope.entries, now });
    if (!restored.session || restored.status === "rejected") return { status: "invalid", raw };
    return { status: "ok", raw, checkpoint: { version: 1, profileId: scope.profileId, courseId: scope.courseId, lessonId: scope.lessonId,
      stage: saved.stage, spellingEnabled: saved.spellingEnabled, session: restored.session } };
  } catch { return { status: "invalid", raw }; }
}

/** A stale tab must not replace a checkpoint written by another tab. */
export function saveCheckpoint(storage: Storage, checkpoint: Checkpoint, expected: string | null): string | null {
  try {
    const key = checkpointKey(checkpoint.profileId, checkpoint.courseId, checkpoint.lessonId);
    if (storage.getItem(key) !== expected) return null;
    const next = JSON.stringify(checkpoint);
    storage.setItem(key, next);
    return storage.getItem(key) === next ? next : null;
  } catch { return null; }
}

export function clearCheckpoint(storage: Storage, scope: Pick<Checkpoint, "profileId" | "courseId" | "lessonId">, expected: string | null): boolean {
  try {
    const key = checkpointKey(scope.profileId, scope.courseId, scope.lessonId);
    if (storage.getItem(key) !== expected) return false;
    storage.removeItem(key);
    return storage.getItem(key) === null;
  } catch { return false; }
}
