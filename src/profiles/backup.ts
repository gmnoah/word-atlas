import { parseActivityRecord } from "../learning/activity-record";
import { RESTORE_GENERATION_KEY } from "../lib/restore-generation";
import { migrateV2ToV3, type StorageLike } from "./migration";

type MutableStorage = StorageLike & { removeItem(key: string): void };
const APP = "word-atlas";
const RESTORE_SNAPSHOT = "word-atlas:v3:restore-snapshot";
const managed = (key: string) =>
  key === "word-atlas:settings" || key === "word-atlas:profiles:v1" || key === "word-atlas:course-settings:v1" || key.startsWith("word-atlas:v2:") || key.startsWith("word-atlas:v3:");
const parse = (raw: string) => JSON.parse(raw) as unknown;
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export interface FullBackup {
  app: "word-atlas";
  version: 3;
  exported: string;
  scope: "all-local-data";
  records: Record<string, unknown>;
}
export type RestorePlan = { kind: "v3" | "legacy-v2"; records: Record<string, unknown>; courses: string[]; profileCount: number };

/** Serialize full restore with child-course saves across browser tabs. */
export async function applyRestoreWithLock(storage: MutableStorage, plan: RestorePlan): Promise<ReturnType<typeof applyRestore>> {
  if (!globalThis.navigator?.locks) return { ok: false, error: "此浏览器不支持安全的多页面恢复，请使用支持浏览器锁的浏览器。" };
  try { return await navigator.locks.request("word-atlas:restore", () => {
    // Mark even a failed restore attempt, so stale pages cannot write through a
    // partial restore or rollback. This local-only token is excluded from backups.
    const generation = `${Date.now()}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    storage.setItem(RESTORE_GENERATION_KEY, generation);
    if (storage.getItem(RESTORE_GENERATION_KEY) !== generation) throw new Error("restore generation");
    return applyRestore(storage, plan);
  }); }
  catch { return { ok: false, error: "无法取得恢复锁，请稍后重试。" }; }
}

function snapshot(storage: StorageLike) {
  const records: Record<string, unknown> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !managed(key)) continue;
    const raw = storage.getItem(key);
    if (raw === null) continue;
    records[key] = parse(raw);
  }
  return records;
}
export function exportFullBackup(storage: StorageLike): string {
  const backup: FullBackup = { app: APP, version: 3, exported: new Date().toISOString(), scope: "all-local-data", records: snapshot(storage) };
  return JSON.stringify(backup, null, 1);
}
function validRecords(records: unknown): records is Record<string, unknown> {
  return isObject(records) && Object.entries(records).every(([key, value]) => {
    if (!managed(key) || !isObject(value)) return false;
    if (key.startsWith("word-atlas:v3:activity-archive-backup:")) {
      const parts = key.split(":");
      if (parts.length !== 5 || ![1, 2].includes(value.version as number) || value.profileId !== parts[3] || value.courseId !== parts[4] || typeof value.raw !== "string") return false;
      try {
        if (!parseActivityRecord(JSON.parse(value.raw), parts[3], parts[4])) return false;
        return value.version === 1 || (typeof value.replacement === "string" && !!parseActivityRecord(JSON.parse(value.replacement), parts[3], parts[4]));
      } catch { return false; }
    }
    if (!key.startsWith("word-atlas:v3:activity:")) return true;
    const parts = key.split(":");
    return parts.length === 5 && !!parseActivityRecord(value, parts[3], parts[4]);
  });
}
export function preflightRestore(text: string): { ok: true; plan: RestorePlan } | { ok: false; error: string } {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, error: "文件不是有效的 JSON。" }; }
  if (!isObject(data) || data.app !== APP) return { ok: false, error: "这不是词光的备份。" };
  if (data.version === 3 && data.scope === "all-local-data" && validRecords(data.records)) {
    // Both the IELTS progress keys and the new-course keys belong to the scope,
    // so the restore confirmation counts every course that will be replaced.
    const courses = [
      ...new Set(
        Object.keys(data.records)
          .filter(
            (key) =>
              key.startsWith("word-atlas:v3:progress:") ||
              key.startsWith("word-atlas:v3:primary-progress:") ||
              key.startsWith("word-atlas:v3:activity:") ||
              key.startsWith("word-atlas:v3:activity-archive-backup:"),
          )
          .map((key) => key.split(":").at(-1)!)
          .filter(Boolean),
      ),
    ];
    const profiles = data.records["word-atlas:profiles:v1"];
    const profileCount = isObject(profiles) && Array.isArray(profiles.profiles) ? profiles.profiles.length : 1;
    return { ok: true, plan: { kind: "v3", records: data.records, courses, profileCount } };
  }
  if (data.version === 2 && isObject(data.progress) && typeof data.progress.datasetId === "string" && data.progress.version === 2) {
    const courseId = data.progress.datasetId;
    return { ok: true, plan: { kind: "legacy-v2", records: { "word-atlas:settings": isObject(data.settings) ? data.settings : {}, [`word-atlas:v2:${courseId}`]: data.progress }, courses: [courseId], profileCount: 1 } };
  }
  return { ok: false, error: "备份版本或内容结构不受支持。" };
}
function put(storage: MutableStorage, key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value));
  return storage.getItem(key) === JSON.stringify(value);
}
/** Replaces only Word Atlas keys; other sites and other localStorage keys are untouched. */
export function applyRestore(storage: MutableStorage, plan: RestorePlan): { ok: true; courses: string[] } | { ok: false; error: string } {
  const before = snapshot(storage);
  try {
    if (!put(storage, RESTORE_SNAPSHOT, { version: 1, createdAt: Date.now(), records: before })) throw new Error("snapshot");
    const currentKeys = Object.keys(before);
    for (const key of currentKeys) storage.removeItem(key);
    for (const [key, value] of Object.entries(plan.records)) if (!put(storage, key, value)) throw new Error("write");
    if (plan.kind === "legacy-v2") {
      const migrated = migrateV2ToV3(storage);
      if (migrated.status === "failed") throw new Error(migrated.error);
    }
    return { ok: true, courses: plan.courses };
  } catch (error) {
    try {
      for (let i = storage.length - 1; i >= 0; i--) { const key = storage.key(i); if (key && managed(key)) storage.removeItem(key); }
      for (const [key, value] of Object.entries(before)) put(storage, key, value);
    } catch { /* preserve the recovery snapshot for manual diagnosis */ }
    return { ok: false, error: error instanceof Error && error.message ? `恢复未完成：${error.message}` : "恢复未完成，已尝试还原原数据。" };
  }
}
