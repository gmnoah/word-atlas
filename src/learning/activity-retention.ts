import { parseActivityRecord, type ActivityRecord, type ArchivedActivitySummary } from "./activity-record";

/** Candidates only; does not modify or remove user data. Protected IDs include every recoverable checkpoint. */
export function activityArchiveCandidates(record: ActivityRecord, now: number, protectedSessionIds: ReadonlySet<string>, retentionDays = 90): string[] {
  if (!Number.isFinite(now) || now < 0 || !Number.isInteger(retentionDays) || retentionDays < 7) return [];
  const cutoff = now - retentionDays * 86_400_000;
  if (cutoff <= 0) return [];
  return Object.values(record.sessions).filter((session) => {
    if (protectedSessionIds.has(session.sessionId) || session.endedAt === undefined || session.endReason === undefined || session.endedAt > cutoff || session.updatedAt > cutoff) return false;
    // Unknown event dates or timestamps cannot prove that the session is outside
    // the retention window. Keep those records intact until they can be audited.
    if (session.retryHistoryIncomplete || Object.keys(session.retryEvents ?? {}).some((id) => session.retryEventTimes?.[id] === undefined)) return false;
    if ((session.introSkipped ?? []).some((id) => session.introSkipTimes?.[id] === undefined)) return false;
    const answers = Object.keys(session.answers);
    const introduced = session.introduced;
    if (answers.some((id) => session.answerTimes?.[id] === undefined || session.answerOffsets?.[id] === undefined || session.answerDays?.[id] === undefined) ||
        introduced.some((id) => session.introducedTimes?.[id] === undefined || session.introducedOffsets?.[id] === undefined || session.introducedDays?.[id] === undefined)) return false;
    // Avoid archiving data written after its declared end, including clock anomalies.
    return [...Object.values(session.answerTimes ?? {}), ...Object.values(session.introducedTimes ?? {}), ...Object.values(session.introSkipTimes ?? {}), ...Object.values(session.retryEventTimes ?? {})].every((time) => time <= cutoff && time <= session.endedAt!);
  }).map((session) => session.sessionId);
}

export interface CheckpointInventoryStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
}
/** An unparseable checkpoint prevents compaction; unknown state is never treated as safe. */
export function protectedActivitySessions(storage: CheckpointInventoryStorage, profileId: string, courseId: string): { ok: true; ids: Set<string> } | { ok: false } {
  if (![profileId, courseId].every((id) => /^[a-z0-9_-]{1,80}$/i.test(id))) return { ok: false };
  const prefixes = [`word-atlas:v3:primary-session:${profileId}:${courseId}:`, `word-atlas:v3:hanzi-session:${profileId}:${courseId}:`];
  const ids = new Set<string>();
  try {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key || !prefixes.some((prefix) => key.startsWith(prefix))) continue;
      const raw = storage.getItem(key);
      if (raw === null) return { ok: false };
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false };
      const checkpoint = value as Record<string, unknown>;
      if (checkpoint.version !== 1 || checkpoint.profileId !== profileId || checkpoint.courseId !== courseId || !checkpoint.session || typeof checkpoint.session !== "object" || Array.isArray(checkpoint.session)) return { ok: false };
      const id = (checkpoint.session as Record<string, unknown>).id;
      if (typeof id !== "string" || !/^[a-z0-9_-]{1,120}$/i.test(id)) return { ok: false };
      ids.add(id);
    }
    return { ok: true, ids };
  } catch { return { ok: false }; }
}

/** A reviewable summary; the caller must still back up and validate before any compaction. */
export function activityArchivePreview(record: ActivityRecord, candidates: readonly string[]) {
  const unique = [...new Set(candidates)];
  const totals = { sessions: 0, introductionEvents: 0, independent: 0, hinted: 0, assisted: 0, incorrect: 0, skipped: 0, resourceErrors: 0, introSkipped: 0, retrySkipped: 0, retryResourceErrors: 0, coReadSessions: 0 };
  for (const id of unique) {
    const session = record.sessions[id];
    if (!session) throw new Error("Archive candidate is missing");
    totals.sessions++;
    totals.introductionEvents += session.introduced.length;
    totals.introSkipped += session.introSkipped?.length ?? 0;
    if (session.mode === "co-read" && session.introduced.length) totals.coReadSessions++;
    for (const result of Object.values(session.answers)) {
      if (result === "resource-error") totals.resourceErrors++;
      else totals[result]++;
    }
    for (const result of Object.values(session.retryEvents ?? {})) {
      if (result === "resource-error") totals.retryResourceErrors++;
      else totals.retrySkipped++;
    }
  }
  return { sessionIds: unique, totals };
}

export interface ArchivedActivitySession {
  sessionId: string;
  endedAt: number;
  totals: ReturnType<typeof activityArchivePreview>["totals"];
  introHistoryKnown: boolean;
  retryHistoryKnown: boolean;
  undatedRecognition: number;
}

/** Build compact summaries without mutating the source or claiming unknown history is zero. */
export function prepareActivityArchive(record: ActivityRecord, now: number, protectedSessionIds: ReadonlySet<string>) {
  const ids = activityArchiveCandidates(record, now, protectedSessionIds);
  return ids.map((id): ArchivedActivitySession => {
    const session = record.sessions[id];
    const totals = activityArchivePreview(record, [id]).totals;
    const undatedRecognition = Object.entries(session.answers).filter(([entryId, outcome]) => outcome !== "skipped" && outcome !== "resource-error" && !session.answerDays?.[entryId]).length;
    return { sessionId: id, endedAt: session.endedAt!, totals,
      introHistoryKnown: session.introSkipped !== undefined,
      retryHistoryKnown: session.retryEvents !== undefined && !session.retryHistoryIncomplete,
      undatedRecognition };
  });
}

/** Prepare a validated replacement in memory; the caller must back up and hold the course lock before writing. */
export function compactActivityRecord(record: ActivityRecord, now: number, protectedSessionIds: ReadonlySet<string>): ActivityRecord {
  if (!parseActivityRecord(record, record.profileId, record.courseId)) throw new Error("Invalid activity record");
  const ids = activityArchiveCandidates(record, now, protectedSessionIds);
  if (!ids.length) return record;
  const sessions = { ...record.sessions };
  const archivedSessions = { ...record.archivedSessions };
  for (const id of ids) {
    const session = sessions[id];
    const preview = activityArchivePreview(record, [id]).totals;
    const { sessions: _sessions, introductionEvents: _introductions, ...totals } = preview;
    const recognitionByDay: Record<string, number> = {};
    for (const [entryId, outcome] of Object.entries(session.answers)) {
      if (outcome === "skipped" || outcome === "resource-error") continue;
      const day = session.answerDays![entryId];
      recognitionByDay[day] = (recognitionByDay[day] ?? 0) + 1;
    }
    const summary: ArchivedActivitySummary = { sessionId: id, contentVersions: session.contentVersions ?? [session.contentVersion], mode: session.mode, endedAt: session.endedAt!, totals, recognitionByDay,
      coReadDays: session.mode === "co-read" ? [...new Set(Object.values(session.introducedDays ?? {}))] : [], introHistoryKnown: session.introSkipped !== undefined, retryHistoryKnown: session.retryEvents !== undefined && !session.retryHistoryIncomplete };
    archivedSessions[id] = summary;
    delete sessions[id];
  }
  const next = { ...record, sessions, archivedSessions };
  if (!parseActivityRecord(next, record.profileId, record.courseId)) throw new Error("Invalid activity archive");
  return next;
}
