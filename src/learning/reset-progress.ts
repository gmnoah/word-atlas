/**
 * Helpers for resetting course progress while keeping user settings and profiles safe.
 */

export function resetCourseProgress(storage: Storage, profileId: string, courseId: string): void {
  if (!profileId || !courseId) return;

  storage.removeItem(`word-atlas:v3:primary-progress:${profileId}:${courseId}`);
  storage.removeItem(`word-atlas:v3:activity:${profileId}:${courseId}`);
  storage.removeItem(`word-atlas:v3:activity-archive-backup:${profileId}:${courseId}`);

  const sessionPrefix1 = `word-atlas:v3:primary-session:${profileId}:${courseId}:`;
  const sessionPrefix2 = `word-atlas:v3:hanzi-session:${profileId}:${courseId}:`;
  const sessionPrefix3 = `word-atlas:v3:progress:${profileId}:${courseId}`;

  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    if (
      key.startsWith(sessionPrefix1) ||
      key.startsWith(sessionPrefix2) ||
      key === sessionPrefix3
    ) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    storage.removeItem(key);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("primary-progress-changed"));
    window.dispatchEvent(new Event("storage"));
  }
}

export function resetAllLearningProgress(storage: Storage): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    if (
      key.startsWith("word-atlas:v3:progress:") ||
      key.startsWith("word-atlas:v3:primary-progress:") ||
      key.startsWith("word-atlas:v3:activity:") ||
      key.startsWith("word-atlas:v3:activity-archive-backup:") ||
      key.startsWith("word-atlas:v3:primary-session:") ||
      key.startsWith("word-atlas:v3:hanzi-session:") ||
      key.startsWith("word-atlas:v2:")
    ) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    storage.removeItem(key);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("primary-progress-changed"));
    window.dispatchEvent(new Event("storage"));
  }
}
