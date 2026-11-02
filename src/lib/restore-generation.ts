/** Local-only marker: never included in exported backups or restored from a file. */
export const RESTORE_GENERATION_KEY = "word-atlas:restore-generation";

export function readRestoreGeneration(storage: Pick<Storage, "getItem">): string | null {
  try {
    return storage.getItem(RESTORE_GENERATION_KEY);
  } catch {
    return null;
  }
}
