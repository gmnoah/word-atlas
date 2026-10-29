import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyPrimaryProgress } from "../learning/primary-progress";
import { journeyProgress, suggestedJourneyLessons } from "./journey-progress";
import type { Lesson } from "./types";

test("exploration counts distinct current entries without treating cards as viewed", () => {
  const progress = emptyPrimaryProgress("learner", "primary-starter");
  progress.introduced = { a: 1, removed: 2 };
  const lessons: Lesson[] = [
    { id: "first", title: "First", subtitle: "", entryIds: ["a", "a", "b", "removed"] },
    { id: "second", title: "Second", subtitle: "", entryIds: ["a"] },
    { id: "empty", title: "Empty", subtitle: "", entryIds: [] },
  ];
  const result = journeyProgress(progress, lessons, ["a", "b"]);
  assert.deepEqual([result.seen, result.total], [1, 2]);
  assert.deepEqual(result.themes.map((theme) => [theme.viewed, theme.total, theme.state]), [[1, 2, "partial"], [1, 1, "visited"], [0, 0, "new"]]);
});


test("suggested topics prioritize latest first viewing and keep ties stable", () => {
 const progress = emptyPrimaryProgress("learner", "primary-starter");
 progress.introduced = { b: 20, a: 10 };
 const lessons: Lesson[] = ["a", "b", "c", "d"].map((id) => ({id, title: id, subtitle: "", entryIds: [id]}));
 const data = journeyProgress(progress, lessons, ["a", "b", "c", "d"]);
 assert.deepEqual(suggestedJourneyLessons(lessons, data).map((lesson) => lesson.id), ["b", "a", "c"]);
 assert.deepEqual(suggestedJourneyLessons(lessons, null).map((lesson) => lesson.id), ["a", "b", "c"]);
});
