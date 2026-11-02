import assert from "node:assert/strict";
import test from "node:test";
import { primaryFull } from "../courses/primary-full";
import { primaryVisualPolicy } from "../courses/starting-point";
import { checkpointRevision } from "./session-persistence";
import { createLearningSession, learningReducer } from "./session";

test("clock-only updates do not create a new checkpoint revision", () => {
  const now = Date.now();
  const session = createLearningSession({
    courseId: "primary-starter",
    contentVersion: "test",
    policy: primaryVisualPolicy("starter", false),
    pool: primaryFull.entries.slice(0, 2),
    due: [],
    fresh: primaryFull.entries.slice(0, 2),
    requestedNewCount: 2,
    now,
    seed: 1,
    visible: true,
  });
  const initialRevision = checkpointRevision(session);
  const ticked = learningReducer(session, {
    type: "tick",
    at: now + 1_000,
    visible: true,
  });

  assert.ok(ticked.activeMs > session.activeMs);
  assert.equal(checkpointRevision(ticked), initialRevision);

  const advanced = learningReducer(ticked, { type: "next", at: now + 2_000 });
  assert.notEqual(checkpointRevision(advanced), initialRevision);

  const stopped = learningReducer(advanced, { type: "stop", at: now + 3_000 });
  assert.notEqual(checkpointRevision(stopped), checkpointRevision(advanced));
});
