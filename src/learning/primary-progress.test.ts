import assert from "node:assert/strict";
import { test } from "node:test";
import { primarySample } from "../courses/primary-sample";
const sampleCourses = [primarySample];
import { PRIMARY_STARTER_POLICY } from "./policy";
import { createLearningSession, currentStep, learningReducer } from "./session";
import { applyPrimarySession, emptyPrimaryProgress, parsePrimaryProgress, primaryDueIds, primaryReviewIds, primaryProgressKey, readPrimaryProgress, togglePrimaryFavorite, writePrimaryProgress } from "./primary-progress";

const entries = sampleCourses[0].entries;
function session() {
  return createLearningSession({ courseId: "primary-starter", contentVersion: "test", policy: PRIMARY_STARTER_POLICY,
    pool: entries, due: [entries[0]], fresh: [], now: 1000, seed: 42 });
}
function answer(s: ReturnType<typeof session>, support?: "assisted" | "hinted") {
  if (support) s = learningReducer(s, { type: "support", support, at: 1100 });
  return learningReducer(s, { type: "answer", at: 1200, optionId: currentStep(s)!.contentId });
}

test("first eligible recall schedules exactly once; introductions are separate", () => {
  const s = answer(session());
  s.introduced = [entries[1].id];
  const result = applyPrimarySession(emptyPrimaryProgress("child-a", "primary-starter"), s);
  assert.equal(result.introduced[entries[1].id], 1000);
  assert.equal(result.cards[entries[1].id], undefined);
  assert.equal(result.cards[entries[0].id].reps, 1);
  assert.deepEqual(applyPrimarySession(result, s), result);
  assert.deepEqual(primaryDueIds(result, result.cards[entries[0].id].due), [entries[0].id]);
});

test("review includes introduced but unassessed words and due cards only", () => {
  const s = answer(session());
  s.introduced = [entries[1].id];
  const progress = applyPrimarySession(emptyPrimaryProgress("child-a", "primary-starter"), s);
  assert.deepEqual(primaryReviewIds(progress, progress.cards[entries[0].id].due - 1), [entries[1].id]);
  assert.deepEqual(primaryReviewIds(progress, progress.cards[entries[0].id].due), [entries[1].id, entries[0].id]);
});

test("all 30 sample words can be introduced, assessed and revisited in bounded sessions", () => {
  let progress = emptyPrimaryProgress("child-a", "primary-starter");
  let now = 10_000;
  const finish = (s: ReturnType<typeof session>) => {
    while (!s.endedAt) {
      const step = currentStep(s)!;
      if (step.kind === "intro") s = learningReducer(s, { type: "next", at: ++now });
      else {
        s = learningReducer(s, { type: "answer", optionId: step.contentId, at: ++now });
        s = learningReducer(s, { type: "next", at: ++now });
      }
    }
    progress = applyPrimarySession(progress, s);
  };
  for (const lesson of sampleCourses[0].lessons) {
    const pool = entries.filter((entry) => lesson.entryIds.includes(entry.id));
    for (let offset = 0; offset < pool.length; offset += 3) {
      const s = createLearningSession({ courseId: "primary-starter", contentVersion: "test", policy: PRIMARY_STARTER_POLICY,
        pool, due: [], fresh: pool.slice(offset, offset + 3), now, seed: now });
      finish(s);
    }
  }
  assert.equal(Object.keys(progress.introduced).length, 30);
  assert.equal(Object.keys(progress.cards).length, 30);
  now += 2 * 86_400_000;
  const remaining = entries.filter((entry) => primaryReviewIds(progress, now).includes(entry.id));
  assert.equal(remaining.length, 30);
  while (remaining.length) {
    const due = remaining.splice(0, PRIMARY_STARTER_POLICY.reviewLimit);
    const s = createLearningSession({ courseId: "primary-starter", contentVersion: "test", policy: PRIMARY_STARTER_POLICY,
      pool: entries, due, fresh: [], now, seed: now });
    assert.ok(s.reviewIds.length <= PRIMARY_STARTER_POLICY.reviewLimit);
    finish(s);
  }
  assert.equal(Object.values(progress.cards).filter((card) => card.reps === 2).length, 30);
});

test("assistance, skip and spelling never update the recognition schedule", () => {
  const initial = emptyPrimaryProgress("child-a", "primary-starter");
  assert.deepEqual(applyPrimarySession(initial, answer(session(), "assisted")).cards, {});
  const skipped = learningReducer(session(), { type: "skip", at: 1200 });
  assert.deepEqual(applyPrimarySession(initial, skipped).cards, {});
  const spelling = answer(session());
  spelling.attempts[entries[0].id].kind = "spell";
  assert.deepEqual(applyPrimarySession(initial, spelling).cards, {});
  assert.equal(applyPrimarySession(initial, answer(session(), "hinted")).cards[entries[0].id].reps, 1);
});

test("scoped storage keeps existing data when malformed and reports write failure", () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const progress = togglePrimaryFavorite(emptyPrimaryProgress("child-a", "primary-starter"), entries[0].id);
  assert.equal(writePrimaryProgress(storage, progress), true);
  assert.deepEqual(readPrimaryProgress(storage, "child-a", "primary-starter"), { ok: true, progress });
  const other = readPrimaryProgress(storage, "child-b", "primary-starter");
  assert.ok(other.ok && other.progress.favorites.length === 0);
  assert.equal(parsePrimaryProgress(progress, "child-b", "primary-starter"), null);
  const key = primaryProgressKey("child-a", "primary-starter");
  data.set(key, "broken");
  assert.equal(readPrimaryProgress(storage, "child-a", "primary-starter").ok, false);
  assert.equal(writePrimaryProgress(storage, progress), false);
  assert.equal(data.get(key), "broken");
  assert.equal(writePrimaryProgress({ ...storage, setItem() { throw new Error("quota"); } }, progress), false);
  assert.throws(() => togglePrimaryFavorite(progress, "__proto__"));
});
