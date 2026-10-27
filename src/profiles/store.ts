import { useSyncExternalStore } from "react";
import type { LearnerProfile } from "../courses/types";

export interface LearningPreferences {
  englishCount: 2 | 3 | 5;
  hanziCount: 2 | 3 | 5;
  slow: boolean;
  /** Caregiver session length in minutes; 0 follows the stage default. */
  minutes: number;
}

export interface ProfileState {
  version: 1;
  activeProfileId: string;
  profiles: LearnerProfile[];
  /** Settings are deliberately scoped by learner and course, never by device. */
  coursePreferences: Record<string, LearningPreferences>;
}

export const PROFILE_KEY = "word-atlas:profiles:v1";
export const COURSE_SETTINGS_KEY = "word-atlas:course-settings:v1";
const MAX_PROFILES = 12;
const DEFAULT_PROFILE: LearnerProfile = {
  id: "learner-default",
  nickname: "小小探索家",
  createdAt: 0,
};
export const defaultLearningPreferences: LearningPreferences = Object.freeze({
  englishCount: 3,
  hanziCount: 2,
  slow: true,
  minutes: 0,
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const isCount = (value: unknown): value is 2 | 3 | 5 => value === 2 || value === 3 || value === 5;
const isMinutes = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 30;

export function normalizeNickname(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const nickname = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return nickname && Array.from(nickname).length <= 16 ? nickname : null;
}

export function sanitizeProfiles(value: unknown): Pick<ProfileState, "activeProfileId" | "profiles"> {
  const fallback = { activeProfileId: DEFAULT_PROFILE.id, profiles: [DEFAULT_PROFILE] };
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.profiles)) return fallback;

  const ids = new Set<string>();
  const profiles: LearnerProfile[] = [];
  for (const raw of value.profiles) {
    if (!isObject(raw) || typeof raw.id !== "string" || raw.id.length > 80 || ids.has(raw.id)) continue;
    const nickname = normalizeNickname(raw.nickname);
    if (!nickname || typeof raw.createdAt !== "number" || !Number.isFinite(raw.createdAt) || raw.createdAt < 0) continue;
    ids.add(raw.id);
    profiles.push({ id: raw.id, nickname, createdAt: raw.createdAt });
    if (profiles.length === MAX_PROFILES) break;
  }
  if (!profiles.length) return fallback;
  const activeProfileId =
    typeof value.activeProfileId === "string" && ids.has(value.activeProfileId)
      ? value.activeProfileId
      : profiles[0].id;
  return { activeProfileId, profiles };
}

export function sanitizeCoursePreferences(value: unknown): Record<string, LearningPreferences> {
  if (!isObject(value) || value.version !== 1 || !isObject(value.coursePreferences)) return {};
  const result: Record<string, LearningPreferences> = {};
  for (const [key, raw] of Object.entries(value.coursePreferences)) {
    if (!/^[a-z0-9_-]{1,80}:[a-z0-9_-]{1,80}$/i.test(key) || !isObject(raw)) continue;
    if (!isCount(raw.englishCount) || !isCount(raw.hanziCount) || typeof raw.slow !== "boolean") continue;
    // Older records have no session length; treat that as "follow the stage".
    const minutes = raw.minutes === undefined ? 0 : raw.minutes;
    if (!isMinutes(minutes)) continue;
    result[key] = {
      englishCount: raw.englishCount,
      hanziCount: raw.hanziCount,
      slow: raw.slow,
      minutes,
    };
  }
  return result;
}

function read(key: string): unknown {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
function courseKey(profileId: string, courseId: string) {
  return `${profileId}:${courseId}`;
}
function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `learner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const profileData = sanitizeProfiles(read(PROFILE_KEY));
let state: ProfileState = {
  version: 1,
  ...profileData,
  coursePreferences: sanitizeCoursePreferences(read(COURSE_SETTINGS_KEY)),
};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}
function saveProfiles() {
  write(PROFILE_KEY, { version: 1, activeProfileId: state.activeProfileId, profiles: state.profiles });
}
function saveCoursePreferences() {
  write(COURSE_SETTINGS_KEY, { version: 1, coursePreferences: state.coursePreferences });
}

export function preferencesFor(
  profileState: ProfileState,
  profileId: string,
  courseId: string,
): LearningPreferences {
  return profileState.coursePreferences[courseKey(profileId, courseId)] ?? defaultLearningPreferences;
}

export const profileStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  select(profileId: string) {
    if (!state.profiles.some((profile) => profile.id === profileId) || profileId === state.activeProfileId) return;
    state = { ...state, activeProfileId: profileId };
    saveProfiles();
    emit();
  },
  add(nickname: string): { ok: true; profile: LearnerProfile } | { ok: false; error: string } {
    const name = normalizeNickname(nickname);
    if (!name) return { ok: false, error: "昵称需要 1–16 个字符，且不能含控制字符。" };
    if (state.profiles.length >= MAX_PROFILES) return { ok: false, error: `这台设备最多保存 ${MAX_PROFILES} 位学习者。` };
    const profile = { id: createId(), nickname: name, createdAt: Date.now() };
    state = { ...state, profiles: [...state.profiles, profile], activeProfileId: profile.id };
    saveProfiles();
    emit();
    return { ok: true, profile };
  },
  rename(profileId: string, nickname: string): { ok: true } | { ok: false; error: string } {
    const name = normalizeNickname(nickname);
    if (!name) return { ok: false, error: "昵称需要 1–16 个字符，且不能含控制字符。" };
    if (!state.profiles.some((profile) => profile.id === profileId)) return { ok: false, error: "没有找到这位学习者。" };
    state = {
      ...state,
      profiles: state.profiles.map((profile) => (profile.id === profileId ? { ...profile, nickname: name } : profile)),
    };
    saveProfiles();
    emit();
    return { ok: true };
  },
  setCoursePreferences(profileId: string, courseId: string, patch: Partial<LearningPreferences>) {
    if (!state.profiles.some((profile) => profile.id === profileId)) return;
    const current = preferencesFor(state, profileId, courseId);
    const next = { ...current, ...patch };
    if (!isCount(next.englishCount) || !isCount(next.hanziCount) || typeof next.slow !== "boolean" || !isMinutes(next.minutes)) return;
    state = {
      ...state,
      coursePreferences: { ...state.coursePreferences, [courseKey(profileId, courseId)]: next },
    };
    saveCoursePreferences();
    emit();
  },
  reload() {
    const profileData = sanitizeProfiles(read(PROFILE_KEY));
    state = {
      version: 1,
      ...profileData,
      coursePreferences: sanitizeCoursePreferences(read(COURSE_SETTINGS_KEY)),
    };
    emit();
  },
};

export function handleProfileStorageEvent(e: { key: string | null; newValue: string | null }): boolean {
  if (!e.newValue) return false;
  try {
    if (e.key === PROFILE_KEY) {
      const sanitized = sanitizeProfiles(JSON.parse(e.newValue));
      state = { ...state, ...sanitized };
      emit();
      return true;
    }
    if (e.key === COURSE_SETTINGS_KEY) {
      const coursePreferences = sanitizeCoursePreferences(JSON.parse(e.newValue));
      state = { ...state, coursePreferences };
      emit();
      return true;
    }
  } catch {
    /* ignore malformed writes */
  }
  return false;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    handleProfileStorageEvent(e);
  });
}

export function useProfiles<T>(select: (snapshot: ProfileState) => T): T {
  return useSyncExternalStore(profileStore.subscribe, () => select(state), () => select(state));
}
