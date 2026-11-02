import type { LearningSession } from "./session";

/**
 * Clock ticks update elapsed time for the current screen, but do not need a
 * new checkpoint write every second. A step, support choice, answer, finish or
 * other durable session change still produces a different revision.
 */
export function checkpointRevision(session: LearningSession): string {
  const {
    activeMs: _activeMs,
    lastTickAt: _lastTickAt,
    stepActiveMs: _stepActiveMs,
    visible: _visible,
    ...durable
  } = session;
  return JSON.stringify(durable);
}
