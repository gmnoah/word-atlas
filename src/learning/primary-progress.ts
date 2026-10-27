import { review, type CardState } from "../store/srs";
import type { LearningSession } from "./session";

/**
 * The same local progress shape serves both new courses; keys stay scoped by
 * learner and course so a Hanzi child never shares an English card.
 */
export const primaryProgressKey = (profileId: string, courseId: string) => {
  if (![profileId, courseId].every((id) => /^[a-z0-9_-]{1,80}$/i.test(id))) throw new Error("Invalid progress scope");
  return `word-atlas:v3:primary-progress:${profileId}:${courseId}`;
};

export interface PrimaryProgress {
  version: 1;
  profileId: string;
  courseId: string;
  introduced: Record<string, number>;
  cards: Record<string, CardState>;
  favorites: string[];
  /** Each session/content pair is applied at most once, even after restoring a backup. */
  applied: Record<string, string[]>;
}

export function emptyPrimaryProgress(profileId: string, courseId: string): PrimaryProgress {
  primaryProgressKey(profileId, courseId);
  return { version: 1, profileId, courseId, introduced: {}, cards: {}, favorites: [], applied: {} };
}

const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const id = (x: unknown): x is string => typeof x === "string" && /^[a-z0-9_-]{1,120}$/i.test(x)
  && !["__proto__", "constructor", "prototype"].includes(x.toLowerCase());
const number = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0;

function validCard(value: unknown): value is CardState {
  return object(value) && [value.due, value.s, value.d, value.el, value.sd, value.ls, value.reps, value.lapses, value.seen].every(number)
    && [0, 1, 2, 3].includes(value.st as number) && (value.last === undefined || number(value.last));
}

/** Reject unknown or damaged data rather than silently replacing it. */
export function parsePrimaryProgress(raw: unknown, profileId: string, courseId: string): PrimaryProgress | null {
  if (!object(raw) || raw.version !== 1 || raw.profileId !== profileId || raw.courseId !== courseId ||
    !object(raw.introduced) || !object(raw.cards) || !object(raw.applied) || !Array.isArray(raw.favorites)) return null;
  if (!Object.entries(raw.introduced).every(([key, value]) => id(key) && number(value)) ||
    !Object.entries(raw.cards).every(([key, value]) => id(key) && validCard(value)) ||
    !raw.favorites.every(id) || new Set(raw.favorites).size !== raw.favorites.length ||
    !Object.entries(raw.applied).every(([key, value]) => id(key) && Array.isArray(value) && value.every(id) && new Set(value).size === value.length)) return null;
  return raw as unknown as PrimaryProgress;
}

/** Record introductions separately; only first eligible recall updates a card. */
export function applyPrimarySession(progress: PrimaryProgress, session: LearningSession): PrimaryProgress {
  if (session.courseId !== progress.courseId || !id(session.id)) throw new Error("Invalid session scope");
  const next = structuredClone(progress);
  for (const contentId of session.introduced) if (id(contentId) && next.introduced[contentId] === undefined)
    next.introduced[contentId] = session.startedAt;
  const applied = new Set(next.applied[session.id] ?? []);
  for (const attempt of Object.values(session.attempts)) {
    if (!id(attempt.contentId) || applied.has(attempt.contentId) || !attempt.first || !attempt.counted ||
      attempt.result.outcome !== "answered" || attempt.result.support === "assisted" ||
      attempt.kind === "intro" || attempt.kind === "spell" || attempt.result.contentId !== attempt.contentId ||
      ![1, 2, 3, 4].includes(attempt.grade ?? 0) || !number(attempt.at)) continue;
    const previous = next.cards[attempt.contentId];
    // Refuse stale sessions rather than moving an existing schedule backwards.
    if (previous?.last !== undefined && attempt.at < previous.last) continue;
    next.cards[attempt.contentId] = review(previous, attempt.grade!, attempt.at);
    applied.add(attempt.contentId);
  }
  if (applied.size) next.applied[session.id] = [...applied];
  return next;
}

export function togglePrimaryFavorite(progress: PrimaryProgress, contentId: string): PrimaryProgress {
  if (!id(contentId)) throw new Error("Invalid content ID");
  return { ...progress, favorites: progress.favorites.includes(contentId)
    ? progress.favorites.filter((item) => item !== contentId) : [...progress.favorites, contentId] };
}

export function primaryDueIds(progress: PrimaryProgress, now: number): string[] {
  return Object.entries(progress.cards).filter(([, card]) => card.due <= now)
    .sort((a, b) => a[1].due - b[1].due).map(([contentId]) => contentId);
}

export interface ProgressStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function readPrimaryProgress(storage: ProgressStorage, profileId: string, courseId: string):
  { ok: true; progress: PrimaryProgress } | { ok: false; error: string } {
  try {
    const raw = storage.getItem(primaryProgressKey(profileId, courseId));
    if (raw === null) return { ok: true, progress: emptyPrimaryProgress(profileId, courseId) };
    const progress = parsePrimaryProgress(JSON.parse(raw), profileId, courseId);
    return progress ? { ok: true, progress } : { ok: false, error: "学习记录格式无法识别，原数据已保留。" };
  } catch { return { ok: false, error: "无法读取学习记录，原数据已保留。" }; }
}

export function writePrimaryProgress(storage: ProgressStorage, progress: PrimaryProgress): boolean {
  try {
    if (!parsePrimaryProgress(progress, progress.profileId, progress.courseId)) return false;
    const key = primaryProgressKey(progress.profileId, progress.courseId);
    const existing = storage.getItem(key);
    if (existing !== null && !parsePrimaryProgress(JSON.parse(existing), progress.profileId, progress.courseId)) return false;
    const value = JSON.stringify(progress);
    storage.setItem(key, value);
    return storage.getItem(key) === value;
  } catch { return false; }
}

/** All tabs updating a learner's primary records must use the same browser lock. */
export async function withPrimaryLock<T>(profileId: string, courseId: string, work: () => T): Promise<T> {
  const key = primaryProgressKey(profileId, courseId);
  if (!globalThis.navigator?.locks) throw new Error("此浏览器不支持安全的多页面保存。");
  return navigator.locks.request(key, work);
}

/** Revisit introduced words without a recognition card, then due cards. */
export function primaryReviewIds(progress: PrimaryProgress, now: number): string[] {
  return [...Object.keys(progress.introduced).filter((id) => !progress.cards[id]), ...primaryDueIds(progress, now)];
}
