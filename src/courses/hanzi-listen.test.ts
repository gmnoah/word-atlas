import assert from "node:assert/strict";
import { test } from "node:test";
import { createListenGate, type ListenStatus } from "./hanzi-listen";

test("listening unlocks only after playback completes; failures and late callbacks cannot unlock another question", () => {
  const states: ListenStatus[] = [];
  const gate = createListenGate((state) => states.push(state));
  let complete = () => {};
  let fail = () => {};
  gate.start((onComplete, onFail) => { complete = onComplete; fail = onFail; });
  assert.equal(states.at(-1), "playing");
  fail();
  complete();
  assert.equal(states.at(-1), "failed");
  gate.start((onComplete) => { complete = onComplete; });
  complete();
  assert.equal(states.at(-1), "ready");
  gate.start((onComplete) => { complete = onComplete; });
  gate.reset();
  complete();
  assert.equal(states.at(-1), "idle");
  gate.dispose();
});

test("a playback that never completes times out as a failure and can be retried", async () => {
  const states: ListenStatus[] = [];
  const gate = createListenGate((state) => states.push(state), 5);
  gate.start(() => {});
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(states.at(-1), "failed");
  gate.start((complete) => complete());
  assert.equal(states.at(-1), "ready");
  gate.dispose();
});
