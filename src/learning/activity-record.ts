/** Local activity snapshots are scoped independently from scheduling records. */
export interface ActivitySnapshot {
  sessionId: string;
  contentVersion: string;
  contentVersions?: string[];
  mode: "lesson" | "co-read";
  startedAt: number;
  updatedAt: number;
  endedAt?: number;
  endReason?: "completed" | "time-limit" | "user-stopped";
  introduced: string[];
  introSkipped?: string[];
  introSkipTimes?: Record<string, number>;
  retryEvents?: Record<string, "skipped" | "resource-error">;
  retryHistoryIncomplete?: boolean;
  retryEventTimes?: Record<string, number>;
  answerDays?: Record<string, string>;
  introducedDays?: Record<string, string>;
  answerOffsets?: Record<string, number>;
  introducedOffsets?: Record<string, number>;
  answerTimes?: Record<string, number>;
  introducedTimes?: Record<string, number>;
  answers: Record<string, "independent" | "hinted" | "assisted" | "incorrect" | "skipped" | "resource-error">;
}
export interface ActivityRecord {
  version: 1;
  profileId: string;
  courseId: string;
  since: number;
  sessions: Record<string, ActivitySnapshot>;
  archivedSessions?: Record<string, ArchivedActivitySummary>;
}
/** Compact per-session data retains identity, dates, provenance and unknown-history markers. */
export interface ArchivedActivitySummary {
  sessionId: string;
  contentVersions: string[];
  mode: ActivitySnapshot["mode"];
  endedAt: number;
  totals: { independent: number; hinted: number; assisted: number; incorrect: number; skipped: number; resourceErrors: number; introSkipped: number; retrySkipped: number; retryResourceErrors: number; coReadSessions: number };
  recognitionByDay: Record<string, number>;
  coReadDays: string[];
  introHistoryKnown: boolean;
  retryHistoryKnown: boolean;
}
const validId = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9_-]{1,120}$/i.test(value) && !["__proto__", "prototype", "constructor"].includes(value.toLowerCase());
const validTime = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 8_640_000_000_000_000;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const validDay = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const outcomes = new Set(["independent", "hinted", "assisted", "incorrect", "skipped", "resource-error"]);
export function activityKey(profileId: string, courseId: string): string {
  if (!validId(profileId) || !validId(courseId)) throw new Error("Invalid activity scope");
  return `word-atlas:v3:activity:${profileId}:${courseId}`;
}
export function parseActivityRecord(value: unknown, profileId: string, courseId: string): ActivityRecord | null {
  if (!validId(profileId) || !validId(courseId) || !object(value) || value.version !== 1 || value.profileId !== profileId || value.courseId !== courseId || !validTime(value.since) || !object(value.sessions)) return null;
  if (value.archivedSessions !== undefined) {
    if (!object(value.archivedSessions)) return null;
    for (const [id, entry] of Object.entries(value.archivedSessions)) {
      if (!validId(id) || Object.hasOwn(value.sessions, id) || !object(entry) || entry.sessionId !== id || !["lesson", "co-read"].includes(String(entry.mode)) || !validTime(entry.endedAt) || !Array.isArray(entry.contentVersions) || entry.contentVersions.length === 0 || !entry.contentVersions.every((v) => typeof v === "string" && v.length > 0 && v.length <= 100) || new Set(entry.contentVersions).size !== entry.contentVersions.length || typeof entry.introHistoryKnown !== "boolean" || typeof entry.retryHistoryKnown !== "boolean" || !object(entry.totals) || !object(entry.recognitionByDay) || !Array.isArray(entry.coReadDays) || !entry.coReadDays.every(validDay) || new Set(entry.coReadDays).size !== entry.coReadDays.length) return null;
      const keys = ["independent", "hinted", "assisted", "incorrect", "skipped", "resourceErrors", "introSkipped", "retrySkipped", "retryResourceErrors", "coReadSessions"];
      if (Object.keys(entry.totals).length !== keys.length || !keys.every((key) => Number.isSafeInteger(entry.totals && (entry.totals as Record<string, unknown>)[key]) && ((entry.totals as Record<string, number>)[key] >= 0))) return null;
      if (!Object.entries(entry.recognitionByDay).every(([day, count]) => validDay(day) && Number.isSafeInteger(count) && (count as number) > 0)) return null;
      const totals = entry.totals as ArchivedActivitySummary["totals"];
      const dayCount = Object.values(entry.recognitionByDay).reduce<number>((sum, count) => sum + (count as number), 0);
      if (!Number.isSafeInteger(dayCount) || dayCount !== totals.independent + totals.hinted + totals.assisted + totals.incorrect || totals.coReadSessions > 1 || (entry.mode === "lesson" && (totals.coReadSessions !== 0 || entry.coReadDays.length !== 0)) || (entry.mode === "co-read" && (dayCount !== 0 || totals.skipped !== 0 || totals.resourceErrors !== 0 || (entry.coReadDays.length > 0) !== (totals.coReadSessions === 1)))) return null;
    }
  }
  for (const [key, item] of Object.entries(value.sessions)) {
    if (!validId(key) || !object(item) || item.sessionId !== key || typeof item.contentVersion !== "string" || item.contentVersion.length === 0 || item.contentVersion.length > 100 || !["lesson", "co-read"].includes(String(item.mode)) || !validTime(item.startedAt) || !validTime(item.updatedAt) || item.updatedAt < item.startedAt || !Array.isArray(item.introduced) || !item.introduced.every(validId) || new Set(item.introduced).size !== item.introduced.length || !object(item.answers) || !Object.entries(item.answers).every(([id, outcome]) => validId(id) && typeof outcome === "string" && outcomes.has(outcome))) return null;
    if (item.contentVersions !== undefined && (!Array.isArray(item.contentVersions) || !item.contentVersions.includes(item.contentVersion) || !item.contentVersions.every((version) => typeof version === "string" && version.length > 0 && version.length <= 100) || new Set(item.contentVersions).size !== item.contentVersions.length)) return null;
    if ((item.endedAt === undefined) !== (item.endReason === undefined)) return null;
    if (item.endedAt !== undefined && (!validTime(item.endedAt) || item.endedAt < item.startedAt || !["completed", "time-limit", "user-stopped"].includes(String(item.endReason)))) return null;
    if (item.introSkipped !== undefined && (!Array.isArray(item.introSkipped) || !item.introSkipped.every(validId) || new Set(item.introSkipped).size !== item.introSkipped.length)) return null;
    if (item.introSkipTimes !== undefined && (!object(item.introSkipTimes) || !Array.isArray(item.introSkipped) || !Object.entries(item.introSkipTimes).every(([id, time]) => (item.introSkipped as unknown[]).includes(id) && validTime(time)))) return null;
    if (item.retryHistoryIncomplete !== undefined && typeof item.retryHistoryIncomplete !== "boolean") return null;
    if (item.retryEvents !== undefined && (!object(item.retryEvents) || !Object.entries(item.retryEvents).every(([id, outcome]) => /^retry-\d{1,4}$/.test(id) && (outcome === "skipped" || outcome === "resource-error")))) return null;
    if (item.retryEventTimes !== undefined && (!object(item.retryEventTimes) || !object(item.retryEvents) || !Object.entries(item.retryEventTimes).every(([id, time]) => Object.hasOwn(item.retryEvents as object, id) && validTime(time)))) return null;
    if (item.answerDays !== undefined && (!object(item.answerDays) || !Object.entries(item.answerDays).every(([id, day]) => validId(id) && Object.hasOwn(item.answers as object, id) && validDay(day)))) return null;
    if (item.introducedDays !== undefined && (!object(item.introducedDays) || !Object.entries(item.introducedDays).every(([id, day]) => validId(id) && (item.introduced as unknown[]).includes(id) && validDay(day)))) return null;
    for (const [field, days] of [["answerOffsets", item.answerDays], ["introducedOffsets", item.introducedDays]] as const) {
      const offsets = item[field];
      if (offsets !== undefined && (!object(offsets) || !object(days) || !Object.entries(offsets).every(([id, offset]) => Object.hasOwn(days, id) && typeof offset === "number" && Number.isInteger(offset) && Math.abs(offset) <= 840))) return null;
    }
    for (const [field, days] of [["answerTimes", item.answerDays], ["introducedTimes", item.introducedDays]] as const) {
      const times = item[field];
      if (times !== undefined && (!object(times) || !object(days) || !Object.entries(times).every(([id, time]) => Object.hasOwn(days, id) && validTime(time)))) return null;
    }
    for (const [dayField, timeField, offsetField] of [["answerDays", "answerTimes", "answerOffsets"], ["introducedDays", "introducedTimes", "introducedOffsets"]] as const) {
      const days = item[dayField], times = item[timeField], offsets = item[offsetField];
      if (!object(days) || !object(times) || !object(offsets)) continue;
      for (const [id, time] of Object.entries(times)) {
        const offset = offsets[id];
        if (typeof time !== "number" || typeof offset !== "number") continue;
        const local = new Date(time - offset * 60_000);
        if (!Number.isFinite(local.getTime()) || local.toISOString().slice(0, 10) !== days[id]) return null;
      }
    }
    if (item.mode === "co-read" && Object.keys(item.answers).length) return null;
  }
  return value as unknown as ActivityRecord;
}
/** Replace a whole snapshot, making replay idempotent and rejecting stale writes. */
export function putActivitySnapshot(record: ActivityRecord, snapshot: ActivitySnapshot): ActivityRecord {
  if (Object.hasOwn(record.archivedSessions ?? {}, snapshot.sessionId)) throw new Error("Activity session has already been archived");
  const old = record.sessions[snapshot.sessionId];
  if (old && (old.mode !== snapshot.mode || old.startedAt !== snapshot.startedAt)) throw new Error("Activity session identity changed");
  if (old && old.contentVersion !== snapshot.contentVersion) {
    const migrations: Record<string, { target: string; from: string[] }> = {
      "primary-starter": { target: "0.4.0-draft", from: ["0.1.0-draft", "0.2.0-draft", "0.3.0-draft"] },
      "hanzi-starter": { target: "0.7.0-draft", from: ["0.1.0-draft", "0.2.0-draft", "0.3.0-draft", "0.4.0-draft", "0.5.0-draft", "0.6.0-draft"] },
    };
    const migration = migrations[record.courseId];
    if (!migration || snapshot.contentVersion !== migration.target || !migration.from.includes(old.contentVersion)) throw new Error("Activity content version changed unexpectedly");
  }

  // A replay may contain an earlier state at the same clock tick. Preserve
  // previously recorded first outcomes and introductions instead of losing them.
  const newAnswerDays = old ? Object.fromEntries(Object.entries(snapshot.answerDays ?? {}).filter(([id]) => !Object.hasOwn(old.answers, id))) : {};
  const newIntroducedDays = old ? Object.fromEntries(Object.entries(snapshot.introducedDays ?? {}).filter(([id]) => !old.introduced.includes(id))) : {};
  const newAnswerOffsets = old ? Object.fromEntries(Object.entries(snapshot.answerOffsets ?? {}).filter(([id]) => !Object.hasOwn(old.answers, id))) : {};
  const newIntroducedOffsets = old ? Object.fromEntries(Object.entries(snapshot.introducedOffsets ?? {}).filter(([id]) => !old.introduced.includes(id))) : {};
  const newRetryEventTimes = old ? Object.fromEntries(Object.entries(snapshot.retryEventTimes ?? {}).filter(([id]) => !Object.hasOwn(old.retryEvents ?? {}, id))) : {};
  const newIntroSkipTimes = old ? Object.fromEntries(Object.entries(snapshot.introSkipTimes ?? {}).filter(([id]) => !(old.introSkipped ?? []).includes(id))) : {};
  const newAnswerTimes = old ? Object.fromEntries(Object.entries(snapshot.answerTimes ?? {}).filter(([id]) => !Object.hasOwn(old.answers, id))) : {};
  const newIntroducedTimes = old ? Object.fromEntries(Object.entries(snapshot.introducedTimes ?? {}).filter(([id]) => !old.introduced.includes(id))) : {};
  const merged = old ? { ...snapshot, contentVersion: old.contentVersion,
    ...(old.contentVersions || old.contentVersion !== snapshot.contentVersion ? { contentVersions: [...new Set([...(old.contentVersions ?? [old.contentVersion]), snapshot.contentVersion])] } : {}), ...(old.endedAt !== undefined ? { endedAt: old.endedAt, endReason: old.endReason } : {}), updatedAt: Math.max(old.updatedAt, snapshot.updatedAt), introduced: [...new Set([...old.introduced, ...snapshot.introduced])],
    answers: { ...snapshot.answers, ...old.answers }, ...(snapshot.retryHistoryIncomplete || old.retryHistoryIncomplete ? { retryHistoryIncomplete: true } : {}), ...(snapshot.retryEvents || old.retryEvents ? { retryEvents: { ...snapshot.retryEvents, ...old.retryEvents } } : {}), ...(snapshot.retryEventTimes || old.retryEventTimes ? { retryEventTimes: { ...newRetryEventTimes, ...old.retryEventTimes } } : {}), ...(snapshot.introSkipped || old.introSkipped ? { introSkipped: [...new Set([...(old.introSkipped ?? []), ...(snapshot.introSkipped ?? [])])] } : {}), ...(snapshot.introSkipTimes || old.introSkipTimes ? { introSkipTimes: { ...newIntroSkipTimes, ...old.introSkipTimes } } : {}), ...(snapshot.answerDays || old.answerDays ? { answerDays: { ...newAnswerDays, ...old.answerDays } } : {}),
    ...(snapshot.introducedDays || old.introducedDays ? { introducedDays: { ...newIntroducedDays, ...old.introducedDays } } : {}),
    ...(snapshot.answerOffsets || old.answerOffsets ? { answerOffsets: { ...newAnswerOffsets, ...old.answerOffsets } } : {}),
    ...(snapshot.introducedOffsets || old.introducedOffsets ? { introducedOffsets: { ...newIntroducedOffsets, ...old.introducedOffsets } } : {}),
    ...(snapshot.answerTimes || old.answerTimes ? { answerTimes: { ...newAnswerTimes, ...old.answerTimes } } : {}),
    ...(snapshot.introducedTimes || old.introducedTimes ? { introducedTimes: { ...newIntroducedTimes, ...old.introducedTimes } } : {}) } : snapshot;
  if (old && JSON.stringify(old) === JSON.stringify(merged)) return record;
  const next = { ...record, sessions: { ...record.sessions, [snapshot.sessionId]: merged } };
  if (!parseActivityRecord(next, record.profileId, record.courseId)) throw new Error("Invalid activity snapshot");
  return next;
}

export interface ActivityStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function readActivityRecord(storage: ActivityStorage, profileId: string, courseId: string, now: number): { ok: true; record: ActivityRecord } | { ok: false } {
  try {
    const raw = storage.getItem(activityKey(profileId, courseId));
    if (raw === null) {
      if (!validTime(now)) return { ok: false };
      return { ok: true, record: { version: 1, profileId, courseId, since: now, sessions: {} } };
    }
    const record = parseActivityRecord(JSON.parse(raw), profileId, courseId);
    return record ? { ok: true, record } : { ok: false };
  } catch { return { ok: false }; }
}
/** Caller must hold the course lock; invalid existing data is never overwritten. */
export function writeActivityRecord(storage: ActivityStorage, record: ActivityRecord): boolean {
  try {
    if (!parseActivityRecord(record, record.profileId, record.courseId)) return false;
    const key = activityKey(record.profileId, record.courseId);
    const previous = storage.getItem(key);
    if (previous !== null && !parseActivityRecord(JSON.parse(previous), record.profileId, record.courseId)) return false;
    const encoded = JSON.stringify(record);
    storage.setItem(key, encoded);
    return storage.getItem(key) === encoded;
  } catch { return false; }
}

/** Convert only first recognition attempts; callers filter non-recognition Hanzi activities. */
export function snapshotFromSession(session: import("./session").LearningSession, mode: ActivitySnapshot["mode"], updatedAt: number): ActivitySnapshot {
  const introSkipped = Object.values(session.attempts).filter((attempt) => attempt.kind === "intro" && attempt.result.outcome === "skipped").map((attempt) => attempt.contentId);
  const retryEvents: NonNullable<ActivitySnapshot["retryEvents"]> = {};
  const retryEventTimes: Record<string, number> = {};
  const retryHistoryIncomplete = (session.practice?.length ?? 0) >= 1000;
  (retryHistoryIncomplete ? [] : session.practice ?? []).forEach((attempt, index) => {
    if (attempt.result.outcome === "skipped" || attempt.result.outcome === "resource-error") { retryEvents[`retry-${index}`] = attempt.result.outcome; if (validTime(attempt.at)) retryEventTimes[`retry-${index}`] = attempt.at; }
  });
  const introSkipTimes: Record<string, number> = {};
  for (const attempt of Object.values(session.attempts)) if (attempt.kind === "intro" && attempt.result.outcome === "skipped" && validTime(attempt.at)) introSkipTimes[attempt.contentId] = attempt.at;
  const answers: ActivitySnapshot["answers"] = {};
  const answerDays: Record<string, string> = {};
  const introducedDays: Record<string, string> = {};
  const answerOffsets: Record<string, number> = {};
  const introducedOffsets: Record<string, number> = {};
  const answerTimes: Record<string, number> = {};
  const introducedTimes: Record<string, number> = {};
  const introducedDate = new Date(updatedAt);
  if (Number.isFinite(introducedDate.getTime())) {
    const day = `${introducedDate.getFullYear()}-${String(introducedDate.getMonth() + 1).padStart(2, "0")}-${String(introducedDate.getDate()).padStart(2, "0")}`;
    for (const id of session.introduced) { introducedDays[id] = day; introducedOffsets[id] = introducedDate.getTimezoneOffset(); introducedTimes[id] = updatedAt; }
  }
  if (mode !== "co-read") {
    for (const attempt of Object.values(session.attempts)) {
      if (!attempt.first || attempt.kind === "intro" || attempt.kind === "spell") continue;
      const result = attempt.result;
      if (result.outcome === "answered") answers[attempt.contentId] = result.correct ? result.support : "incorrect";
      else if (result.outcome === "skipped" || result.outcome === "resource-error") answers[attempt.contentId] = result.outcome;
      if (Object.hasOwn(answers, attempt.contentId) && validTime(attempt.at)) {
        const date = new Date(attempt.at);
        if (Number.isFinite(date.getTime())) { answerDays[attempt.contentId] = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; answerOffsets[attempt.contentId] = date.getTimezoneOffset(); answerTimes[attempt.contentId] = attempt.at; }
      }
    }
  }
  return { sessionId: session.id, contentVersion: session.contentVersion, mode, startedAt: session.startedAt,
    updatedAt: Math.max(session.startedAt, updatedAt), ...(session.endedAt !== undefined && session.endReason ? { endedAt: session.endedAt, endReason: session.endReason } : {}), introduced: [...new Set(session.introduced)], introSkipped: [...new Set(introSkipped)], introSkipTimes, retryEvents, retryEventTimes, ...(retryHistoryIncomplete ? { retryHistoryIncomplete: true } : {}), answers, answerDays, introducedDays, answerOffsets, introducedOffsets, answerTimes, introducedTimes };
}

/** Called while holding the same learner/course lock as progress and checkpoint writes. */
export function saveSessionActivity(storage: ActivityStorage, profileId: string, session: import("./session").LearningSession, mode: ActivitySnapshot["mode"], now: number): boolean {
  const loaded = readActivityRecord(storage, profileId, session.courseId, now);
  if (!loaded.ok) return false;
  try {
    const snapshot = snapshotFromSession(session, mode, now);
    const updated = putActivitySnapshot(loaded.record, snapshot);
    const previous = loaded.record.sessions[session.id];
    const current = updated.sessions[session.id];
    if (previous && current && JSON.stringify({ ...previous, updatedAt: 0 }) === JSON.stringify({ ...current, updatedAt: 0 })) return true;
    return writeActivityRecord(storage, updated);
  } catch { return false; }
}

export function summarizeActivity(record: ActivityRecord) {
  const totals = { independent: 0, hinted: 0, assisted: 0, incorrect: 0, skipped: 0, resourceErrors: 0, coReadSessions: 0, introSkipped: 0, retrySkipped: 0, retryResourceErrors: 0, retryHistoryIncomplete: false };
  for (const session of Object.values(record.sessions)) {
    if (session.mode === "co-read" && session.introduced.length > 0) totals.coReadSessions++;
    totals.introSkipped += session.introSkipped?.length ?? 0;
    totals.retryHistoryIncomplete ||= !!session.retryHistoryIncomplete;
    for (const event of Object.values(session.retryEvents ?? {})) {
      if (event === "skipped") totals.retrySkipped++;
      else totals.retryResourceErrors++;
    }
    for (const answer of Object.values(session.answers)) {
      if (answer === "resource-error") totals.resourceErrors++;
      else totals[answer]++;
    }
  }
  for (const session of Object.values(record.archivedSessions ?? {})) {
    for (const key of ["independent", "hinted", "assisted", "incorrect", "skipped", "resourceErrors", "coReadSessions", "introSkipped", "retrySkipped", "retryResourceErrors"] as const) totals[key] += session.totals[key];
  }
  return totals;
}

/** Counts recorded first recognition attempts, excluding skips and media failures. */
export function recentRecognitionDays(record: ActivityRecord, now: Date) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index), 12);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { key, count: 0, coRead: 0 };
  });
  const byDay = new Map(days.map((day) => [day.key, day]));
  let undated = 0;
  for (const session of Object.values(record.sessions)) for (const [id, answer] of Object.entries(session.answers)) {
    if (answer === "skipped" || answer === "resource-error") continue;
    const day = session.answerDays?.[id];
    if (!day) { undated++; continue; }
    const bucket = byDay.get(day);
    if (bucket) bucket.count++;
  }
  for (const session of Object.values(record.sessions)) {
    if (session.mode !== "co-read") continue;
    for (const day of new Set(Object.values(session.introducedDays ?? {}))) {
      const bucket = byDay.get(day);
      if (bucket) bucket.coRead++;
    }
  }
  for (const session of Object.values(record.archivedSessions ?? {})) {
    for (const [day, count] of Object.entries(session.recognitionByDay)) { const bucket = byDay.get(day); if (bucket) bucket.count += count; }
    for (const day of session.coReadDays) { const bucket = byDay.get(day); if (bucket) bucket.coRead++; }
  }
  return { days, undated };
}
