import { restoreLearningSession } from "../learning/persistence";
import type { LearningSession } from "../learning/session";
import type { LearningEntry } from "./types";
import { hanziPolicy, type HanziLessonMode } from "./hanzi-policy";

type Storage = Pick<StorageLike, "getItem" | "setItem" | "removeItem">;
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

export interface HanziCheckpoint {
  version: 1;
  profileId: string;
  courseId: string;
  lessonId: string;
  mode: HanziLessonMode;
  voiceAvailable: boolean;
  minutes: number;
  session: LearningSession;
}

const validId = (id: string) => /^[a-z0-9_-]{1,80}$/i.test(id);
export const hanziCheckpointKey = (
  profileId: string,
  courseId: string,
  lessonId: string,
  mode: HanziLessonMode,
) => {
  if (![profileId, courseId, lessonId].every(validId)) throw new Error("Invalid checkpoint scope");
  return `word-atlas:v3:hanzi-session:${profileId}:${courseId}:${lessonId}:${mode}`;
};

/** A saved session is only accepted when it still belongs to this child and lesson. */
export function readHanziCheckpoint(
  storage: Storage,
  scope: { profileId: string; courseId: string; lessonId: string; mode: HanziLessonMode; contentVersion: string; entries: LearningEntry[]; voiceAvailable: boolean },
  now: number,
):
  | { status: "empty"; raw: null }
  | { status: "ok"; raw: string; checkpoint: HanziCheckpoint }
  | { status: "invalid"; raw: string | null } {
  let raw: string | null = null;
  try {
    raw = storage.getItem(
      hanziCheckpointKey(scope.profileId, scope.courseId, scope.lessonId, scope.mode),
    );
    if (raw === null) return { status: "empty", raw };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", raw };
    const saved = value as Record<string, unknown>;
    if (
      saved.version !== 1 ||
      saved.profileId !== scope.profileId ||
      saved.courseId !== scope.courseId ||
      saved.lessonId !== scope.lessonId ||
      saved.mode !== scope.mode ||
      typeof saved.voiceAvailable !== "boolean" ||
      typeof saved.minutes !== "number" ||
      !Number.isFinite(saved.minutes) ||
      saved.minutes < 0
    )
      return { status: "invalid", raw };    const policy = hanziPolicy({
      // Voice availability belongs to this device, not to the saved record:
      // restoring on a device without Mandarin must not revive a listen task.
      voiceAvailable: scope.voiceAvailable,
      disablePicture: scope.lessonId.startsWith("draft-hanzi-"),
      coReading: scope.mode === "co-read",
      entryCount: scope.entries.length,
      timeLimitMinutes: saved.minutes > 0 ? saved.minutes : null,
    });
    let restored = restoreLearningSession(saved.session, {
      courseId: scope.courseId,
      contentVersion: scope.contentVersion,
      policy,
      entries: scope.entries,
      now,
    });
    if (restored.status === "rejected" && scope.courseId === "hanzi-starter" && scope.contentVersion === "0.7.0-draft") {
      const originalLesson = ["nature", "body", "garden", "animals"].includes(scope.lessonId);
      const earlierExpandedLesson = /^draft-hanzi-0[1-8]$/.test(scope.lessonId);
      const latestPriorLesson = /^draft-hanzi-(?:0[9]|1[0-3])$/.test(scope.lessonId);
      const latestLesson = /^draft-hanzi-(?:1[4-9]|2[0-8])$/.test(scope.lessonId);
      const compatibleVersions = ["0.6.0-draft", "0.5.0-draft", ...(originalLesson ? ["0.4.0-draft", "0.3.0-draft", "0.2.0-draft", "0.1.0-draft"] : earlierExpandedLesson ? ["0.4.0-draft", "0.3.0-draft", "0.2.0-draft"] : latestPriorLesson ? ["0.4.0-draft", "0.3.0-draft"] : latestLesson ? ["0.4.0-draft"] : [])];
      for (const version of compatibleVersions) {
        restored = restoreLearningSession(saved.session, {
          courseId: scope.courseId, contentVersion: version, policy, entries: scope.entries, now,
        });
        if (restored.session && restored.status !== "rejected") {
          restored.session.contentVersion = scope.contentVersion;
          break;
        }
      }
    }
    if (!restored.session || restored.status === "rejected") return { status: "invalid", raw };
    return {
      status: "ok",
      raw,
      checkpoint: {
        version: 1,
        profileId: scope.profileId,
        courseId: scope.courseId,
        lessonId: scope.lessonId,
        mode: scope.mode,
        voiceAvailable: scope.voiceAvailable,
        minutes: saved.minutes,
        session: restored.session,
      },
    };
  } catch {
    return { status: "invalid", raw };
  }
}

/** A stale tab must not replace a checkpoint written by another tab. */
export function saveHanziCheckpoint(storage: Storage, checkpoint: HanziCheckpoint, expected: string | null): string | null {
  try {
    const key = hanziCheckpointKey(
      checkpoint.profileId,
      checkpoint.courseId,
      checkpoint.lessonId,
      checkpoint.mode,
    );
    if (storage.getItem(key) !== expected) return null;
    const next = JSON.stringify(checkpoint);
    storage.setItem(key, next);
    return storage.getItem(key) === next ? next : null;
  } catch {
    return null;
  }
}

export function clearHanziCheckpoint(
  storage: Storage,
  scope: Pick<HanziCheckpoint, "profileId" | "courseId" | "lessonId" | "mode">,
  expected: string | null,
): boolean {
  try {
    const key = hanziCheckpointKey(scope.profileId, scope.courseId, scope.lessonId, scope.mode);
    if (storage.getItem(key) !== expected) return false;
    storage.removeItem(key);
    return storage.getItem(key) === null;
  } catch {
    return false;
  }
}
