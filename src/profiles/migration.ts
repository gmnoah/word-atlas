import { sanitizeProfiles } from "./store";
import {
  sanitizeProgress,
  sanitizeSettings,
  type Progress,
  type Settings,
} from "../store/store";

export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface V3CourseProgress extends Omit<Progress, "version" | "datasetId"> {
  version: 3;
  profileId: string;
  courseId: string;
  /** Identifies the historical source without changing stable content IDs. */
  source: "legacy-v2";
}

export interface V3DeviceSettings {
  version: 3;
  theme: Settings["theme"];
  sfx: boolean;
  ambience: Settings["ambience"];
  ambienceVolume: number;
  splash: boolean;
}

export interface V3CourseSettings {
  version: 3;
  profileId: string;
  courseId: string;
  accent: Settings["accent"];
  autoplay: boolean;
  dailyNew: number;
  retention: number;
  spell: boolean;
  startLevel: number;
  onboarded: boolean;
  dataset: Settings["dataset"];
}

export const LEGACY_PROFILE_ID = "learner-default";
const V2_PREFIX = "word-atlas:v2:";
const V2_SETTINGS_KEY = "word-atlas:settings";
const PROFILE_KEY = "word-atlas:profiles:v1";
const SNAPSHOT_KEY = "word-atlas:v3:migration:v2-snapshot";
const COMPLETE_KEY = "word-atlas:v3:migration:v2-complete";
const DEVICE_KEY = "word-atlas:v3:device-settings";
const progressKey = (profileId: string, courseId: string) =>
  `word-atlas:v3:progress:${profileId}:${courseId}`;
const courseSettingsKey = (profileId: string, courseId: string) =>
  `word-atlas:v3:course-settings:${profileId}:${courseId}`;

interface Snapshot {
  version: 1;
  id: string;
  createdAt: number;
  settings: unknown;
  progress: Array<{ courseId: string; source: unknown }>;
}
interface Completion {
  version: 1;
  snapshotId: string;
  completedAt: number;
  courses: string[];
}

export type MigrationResult =
  | { status: "migrated"; courses: string[] }
  | { status: "already-migrated"; courses: string[] }
  | { status: "not-needed" }
  | { status: "failed"; error: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function readStored(storage: StorageLike, key: string): { exists: boolean; value?: unknown } | { error: string } {
  const raw = storage.getItem(key);
  if (raw === null) return { exists: false };
  try {
    return { exists: true, value: JSON.parse(raw) };
  } catch {
    return { error: `“${key}”不是有效 JSON。` };
  }
}
function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function safeSet(storage: StorageLike, key: string, value: unknown): string | null {
  try {
    storage.setItem(key, JSON.stringify(value));
    const written = readStored(storage, key);
    if ("error" in written || !written.exists || !sameJson(written.value, value))
      return `写入“${key}”后未能校验。`;
    return null;
  } catch {
    return `无法写入“${key}”。浏览器空间可能已满或处于受限模式。`;
  }
}
function snapshotId() {
  return globalThis.crypto?.randomUUID?.() ?? `v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validSnapshot(value: unknown): Snapshot | null {
  if (!isObject(value) || value.version !== 1 || typeof value.id !== "string" || !Number.isFinite(value.createdAt)) return null;
  if (!Array.isArray(value.progress)) return null;
  const progress: Snapshot["progress"] = [];
  const seen = new Set<string>();
  for (const item of value.progress) {
    if (!isObject(item) || typeof item.courseId !== "string" || !item.courseId || item.courseId.length > 80 || seen.has(item.courseId))
      return null;
    seen.add(item.courseId);
    progress.push({ courseId: item.courseId, source: item.source });
  }
  return { version: 1, id: value.id, createdAt: value.createdAt as number, settings: value.settings, progress };
}

function validCompletion(value: unknown): Completion | null {
  if (!isObject(value) || value.version !== 1 || typeof value.snapshotId !== "string" || !Array.isArray(value.courses)) return null;
  if (!Number.isFinite(value.completedAt) || !value.courses.every((course) => typeof course === "string")) return null;
  return {
    version: 1,
    snapshotId: value.snapshotId,
    completedAt: value.completedAt as number,
    courses: value.courses as string[],
  };
}

function collectSnapshot(storage: StorageLike): Snapshot | MigrationResult {
  const settings = readStored(storage, V2_SETTINGS_KEY);
  if ("error" in settings) return { status: "failed", error: settings.error };
  const progress: Snapshot["progress"] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(V2_PREFIX)) continue;
    const courseId = key.slice(V2_PREFIX.length);
    if (!courseId || courseId.length > 80) return { status: "failed", error: `旧进度键“${key}”无效。` };
    const source = readStored(storage, key);
    if ("error" in source) return { status: "failed", error: source.error };
    if (!source.exists || !isObject(source.value) || source.value.version !== 2 || source.value.datasetId !== courseId)
      return { status: "failed", error: `旧进度“${key}”格式或课程身份不匹配。` };
    progress.push({ courseId, source: source.value });
  }
  if (!settings.exists && progress.length === 0) return { status: "not-needed" };
  return { version: 1, id: snapshotId(), createdAt: Date.now(), settings: settings.value ?? {}, progress };
}

function ensureLegacyProfile(storage: StorageLike): { key: string; value: unknown } | MigrationResult {
  const current = readStored(storage, PROFILE_KEY);
  if ("error" in current) return { status: "failed", error: current.error };
  const profile = { id: LEGACY_PROFILE_ID, nickname: "我的雅思", createdAt: 0 };
  if (!current.exists)
    return { key: PROFILE_KEY, value: { version: 1, activeProfileId: LEGACY_PROFILE_ID, profiles: [profile] } };
  const safe = sanitizeProfiles(current.value);
  if (safe.profiles.some((item) => item.id === LEGACY_PROFILE_ID)) return { key: PROFILE_KEY, value: current.value };
  return {
    key: PROFILE_KEY,
    value: { version: 1, activeProfileId: safe.activeProfileId, profiles: [...safe.profiles, profile] },
  };
}

function deviceSettings(settings: Settings): V3DeviceSettings {
  return {
    version: 3,
    theme: settings.theme,
    sfx: settings.sfx,
    ambience: settings.ambience,
    ambienceVolume: settings.ambienceVolume,
    splash: settings.splash,
  };
}
function courseSettings(settings: Settings, courseId: string): V3CourseSettings {
  return {
    version: 3,
    profileId: LEGACY_PROFILE_ID,
    courseId,
    accent: settings.accent,
    autoplay: settings.autoplay,
    dailyNew: settings.dailyNew,
    retention: settings.retention,
    spell: settings.spell,
    startLevel: settings.startLevel,
    onboarded: settings.onboarded,
    dataset: settings.dataset,
  };
}
function v3Progress(source: unknown, courseId: string): V3CourseProgress | null {
  if (!isObject(source) || source.version !== 2 || source.datasetId !== courseId) return null;
  const progress = sanitizeProgress(source, courseId);
  return {
    version: 3,
    profileId: LEGACY_PROFILE_ID,
    courseId,
    source: "legacy-v2",
    cards: progress.cards,
    bookmarks: progress.bookmarks,
    days: progress.days,
    typing: progress.typing,
    session: progress.session,
    mistakes: progress.mistakes,
  };
}

/**
 * Copies v2 data into versioned v3 keys. It never removes or alters v2 keys.
 * A snapshot is written before every v3 target, and incomplete runs resume only
 * when already-written targets exactly match that snapshot's intended values.
 */
export function migrateV2ToV3(storage: StorageLike): MigrationResult {
  const completionStored = readStored(storage, COMPLETE_KEY);
  if ("error" in completionStored) return { status: "failed", error: completionStored.error };
  const completed = completionStored.exists ? validCompletion(completionStored.value) : null;
  if (completionStored.exists && !completed)
    return { status: "failed", error: "迁移完成标记损坏；为保护旧数据，未继续写入。" };

  const existingSnapshot = readStored(storage, SNAPSHOT_KEY);
  if ("error" in existingSnapshot) return { status: "failed", error: existingSnapshot.error };
  if (completed && !existingSnapshot.exists)
    return { status: "failed", error: "迁移完成标记缺少对应快照，未继续写入。" };
  let snapshot: Snapshot;
  if (existingSnapshot.exists) {
    const parsed = validSnapshot(existingSnapshot.value);
    if (!parsed) return { status: "failed", error: "迁移快照损坏；为保护旧数据，未继续写入。" };
    snapshot = parsed;
  } else {
    const collected = collectSnapshot(storage);
    if ("status" in collected) return collected;
    snapshot = collected;
    const snapshotError = safeSet(storage, SNAPSHOT_KEY, snapshot);
    if (snapshotError) return { status: "failed", error: snapshotError };
  }

  const profileTarget = ensureLegacyProfile(storage);
  if ("status" in profileTarget) return profileTarget;
  const settings = sanitizeSettings(snapshot.settings);
  const targets: Array<{ key: string; value: unknown }> = [
    profileTarget,
    { key: DEVICE_KEY, value: deviceSettings(settings) },
  ];
  for (const item of snapshot.progress) {
    const progress = v3Progress(item.source, item.courseId);
    if (!progress) return { status: "failed", error: `快照中的“${item.courseId}”无法通过 v2 校验。` };
    targets.push(
      { key: progressKey(LEGACY_PROFILE_ID, item.courseId), value: progress },
      { key: courseSettingsKey(LEGACY_PROFILE_ID, item.courseId), value: courseSettings(settings, item.courseId) },
    );
  }

  if (completed) {
    const courses = snapshot.progress.map((item) => item.courseId);
    if (completed.snapshotId !== snapshot.id || !sameJson(completed.courses, courses))
      return { status: "failed", error: "迁移完成标记与快照不一致，未继续写入。" };
    return { status: "already-migrated", courses };
  }

  for (const target of targets) {
    const existing = readStored(storage, target.key);
    if ("error" in existing) return { status: "failed", error: existing.error };
    if (existing.exists) {
      if (!sameJson(existing.value, target.value))
        return { status: "failed", error: `“${target.key}”已有与迁移快照不一致的数据，未覆盖。` };
      continue;
    }
    const writeError = safeSet(storage, target.key, target.value);
    if (writeError) return { status: "failed", error: writeError };
  }
  const completion: Completion = {
    version: 1,
    snapshotId: snapshot.id,
    completedAt: Date.now(),
    courses: snapshot.progress.map((item) => item.courseId),
  };
  const completionError = safeSet(storage, COMPLETE_KEY, completion);
  if (completionError) return { status: "failed", error: completionError };
  return { status: "migrated", courses: completion.courses };
}

/** Runs only in the browser; callers can inspect the result without exposing old data. */
export function migrateBrowserV2ToV3(): MigrationResult {
  if (typeof window === "undefined") return { status: "not-needed" };
  try {
    return migrateV2ToV3(window.localStorage);
  } catch {
    return { status: "failed", error: "无法访问浏览器本地存储，未执行迁移。" };
  }
}
