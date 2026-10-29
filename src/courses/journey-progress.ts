import type { PrimaryProgress } from "../learning/primary-progress";
import type { Lesson } from "./types";

/** Exploration means viewing, not recall or mastery. Ignore removed course entries. */
export function journeyProgress(progress: PrimaryProgress, lessons: Lesson[], currentEntryIds: Iterable<string>) {
  const valid = new Set(currentEntryIds);
  const seen = new Set(Object.keys(progress.introduced).filter((id) => valid.has(id)));
  return {
    seen: seen.size,
    total: valid.size,
    themes: lessons.map((lesson) => {
      const ids = [...new Set(lesson.entryIds)].filter((id) => valid.has(id));
      const viewed = ids.filter((id) => seen.has(id)).length;
      const lastIntroducedAt = Math.max(0, ...ids.map((id) => progress.introduced[id] ?? 0));
      return { id: lesson.id, viewed, total: ids.length, lastIntroducedAt, state: viewed === 0 ? "new" as const : viewed === ids.length ? "visited" as const : "partial" as const };
    }),
  };
}

/** Prioritize themes with recently first-viewed entries; preserve original order on ties. */
export function suggestedJourneyLessons(lessons: Lesson[], progress: ReturnType<typeof journeyProgress> | null): Lesson[] {
  const times = new Map(progress?.themes.map((theme) => [theme.id, theme.lastIntroducedAt]) ?? []);
  return lessons.map((lesson, index) => ({ lesson, index, time: times.get(lesson.id) ?? 0 }))
    .sort((a, b) => b.time - a.time || a.index - b.index).slice(0, 3).map(({ lesson }) => lesson);
}
