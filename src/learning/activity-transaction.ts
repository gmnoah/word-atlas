import { activityKey, parseActivityRecord, type ActivityRecord, type ActivityStorage } from "./activity-record";
import { compactActivityRecord, protectedActivitySessions, type CheckpointInventoryStorage } from "./activity-retention";

/** Existing event metadata must remain intact before a recovery snapshot is rotated. */
function preservesSnapshot(old: import("./activity-record").ActivitySnapshot, live: import("./activity-record").ActivitySnapshot | undefined): boolean {
  if (!live || live.startedAt !== old.startedAt || live.mode !== old.mode || live.contentVersion !== old.contentVersion || live.updatedAt < old.updatedAt || (old.endedAt !== undefined && (live.endedAt !== old.endedAt || live.endReason !== old.endReason)) || old.introduced.some((id) => !live.introduced.includes(id)) || (old.introSkipped ?? []).some((id) => !live.introSkipped?.includes(id)) || (old.contentVersions ?? []).some((version) => !live.contentVersions?.includes(version)) || (old.retryHistoryIncomplete && !live.retryHistoryIncomplete)) return false;
  for (const key of ["answers", "retryEvents", "introSkipTimes", "retryEventTimes", "answerDays", "introducedDays", "answerOffsets", "introducedOffsets", "answerTimes", "introducedTimes"] as const) {
    const before = old[key] as Record<string, unknown> | undefined;
    const after = live[key] as Record<string, unknown> | undefined;
    if (before && (!after || Object.entries(before).some(([id, value]) => after[id] !== value))) return false;
  }
  return true;
}

/** Call under the same course lock as session saves. Never archive an uncertain checkpoint. */
export function archiveActivityWithBackup(storage: ActivityStorage & CheckpointInventoryStorage, profileId: string, courseId: string, now: number): { ok: true; archived: number } | { ok: false; reason: "invalid" | "inventory-failed" | "conflict" | "backup-exists" | "write-failed" } {
  try {
    const raw = storage.getItem(activityKey(profileId, courseId));
    if (raw === null) return { ok: true, archived: 0 };
    const record = parseActivityRecord(JSON.parse(raw), profileId, courseId);
    if (!record) return { ok: false, reason: "invalid" };
    const inventory = protectedActivitySessions(storage, profileId, courseId);
    if (!inventory.ok) return { ok: false, reason: "inventory-failed" };
    const replacement = compactActivityRecord(record, now, inventory.ids);
    const archived = Object.keys(record.sessions).length - Object.keys(replacement.sessions).length;
    if (!archived) return { ok: true, archived: 0 };
    const result = replaceActivityWithBackup(storage, profileId, courseId, raw, replacement);
    return result.ok ? { ok: true, archived } : result;
  } catch { return { ok: false, reason: "invalid" }; }
}

/** Must run while holding the learner/course lock. A backup remains available after success. */
export function replaceActivityWithBackup(storage: ActivityStorage, profileId: string, courseId: string, expectedRaw: string, next: ActivityRecord): { ok: true } | { ok: false; reason: "conflict" | "invalid" | "backup-exists" | "write-failed" } {
  let key: string;
  try { key = activityKey(profileId, courseId); } catch { return { ok: false, reason: "invalid" }; }
  const backupKey = `word-atlas:v3:activity-archive-backup:${profileId}:${courseId}`;
  try {
    if (storage.getItem(key) !== expectedRaw) return { ok: false, reason: "conflict" };
    if (!parseActivityRecord(JSON.parse(expectedRaw), profileId, courseId) || !parseActivityRecord(next, profileId, courseId)) return { ok: false, reason: "invalid" };
    const previousBackup = storage.getItem(backupKey);
    if (previousBackup !== null) {
      // Rotate only a valid, already-applied backup whose entire session inventory
      // is still represented in the current record. Unknown or rolled-back
      // backups remain untouched so they can be recovered or exported.
      let prior: unknown;
      try { prior = JSON.parse(previousBackup); } catch { return { ok: false, reason: "backup-exists" }; }
      if (!prior || typeof prior !== "object" || Array.isArray(prior)) return { ok: false, reason: "backup-exists" };
      const saved = prior as Record<string, unknown>;
      if (saved.version !== 2 || saved.profileId !== profileId || saved.courseId !== courseId || typeof saved.raw !== "string" || typeof saved.replacement !== "string") return { ok: false, reason: "backup-exists" };
      let previous: ActivityRecord | null, current: ActivityRecord | null;
      try {
        if (!parseActivityRecord(JSON.parse(saved.raw), profileId, courseId)) return { ok: false, reason: "backup-exists" };
        previous = parseActivityRecord(JSON.parse(saved.replacement), profileId, courseId);
        current = parseActivityRecord(JSON.parse(expectedRaw), profileId, courseId);
      } catch { return { ok: false, reason: "backup-exists" }; }
      if (!previous || !current || expectedRaw === saved.raw || Object.entries(previous.archivedSessions ?? {}).some(([id, summary]) => JSON.stringify(current!.archivedSessions?.[id]) !== JSON.stringify(summary)) || Object.entries(previous.sessions).some(([id, old]) => !preservesSnapshot(old, current!.sessions[id]))) return { ok: false, reason: "backup-exists" };
    }
    const encoded = JSON.stringify(next);
    const backup = JSON.stringify({ version: 2, profileId, courseId, raw: expectedRaw, replacement: encoded });
    storage.setItem(backupKey, backup);
    if (storage.getItem(backupKey) !== backup) return { ok: false, reason: "write-failed" };
    try {
      storage.setItem(key, encoded);
      if (storage.getItem(key) !== encoded) throw new Error("write mismatch");
      return { ok: true };
    } catch {
      try { storage.setItem(key, expectedRaw); } catch { /* backup remains for recovery */ }
      return { ok: false, reason: "write-failed" };
    }
  } catch { return { ok: false, reason: "write-failed" }; }
}

/** Caller holds the same learner/course lock; snapshot is retained after recovery. */
export function restoreActivityArchiveBackup(storage: ActivityStorage, profileId: string, courseId: string, expectedCurrent: string | null): { ok: true } | { ok: false; reason: "invalid" | "conflict" | "missing" | "write-failed" } {
  try {
    const key = activityKey(profileId, courseId);
    const backupKey = `word-atlas:v3:activity-archive-backup:${profileId}:${courseId}`;
    if (storage.getItem(key) !== expectedCurrent) return { ok: false, reason: "conflict" };
    const raw = storage.getItem(backupKey);
    if (raw === null) return { ok: false, reason: "missing" };
    const backup: unknown = JSON.parse(raw);
    if (!backup || typeof backup !== "object" || Array.isArray(backup)) return { ok: false, reason: "invalid" };
    const data = backup as Record<string, unknown>;
    if (data.version !== 2 || data.profileId !== profileId || data.courseId !== courseId || typeof data.raw !== "string" || typeof data.replacement !== "string") return { ok: false, reason: "invalid" };
    try { if (!parseActivityRecord(JSON.parse(data.raw), profileId, courseId) || !parseActivityRecord(JSON.parse(data.replacement), profileId, courseId)) return { ok: false, reason: "invalid" }; }
    catch { return { ok: false, reason: "invalid" }; }
    if (expectedCurrent !== data.replacement && expectedCurrent !== data.raw) return { ok: false, reason: "conflict" };
    storage.setItem(key, data.raw);
    return storage.getItem(key) === data.raw ? { ok: true } : { ok: false, reason: "write-failed" };
  } catch { return { ok: false, reason: "write-failed" }; }
}
