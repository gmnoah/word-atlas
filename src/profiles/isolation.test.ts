import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContextIsolationCoordinator,
  contextCoordinator,
} from "./isolation";
import {
  handleProfileStorageEvent,
  preferencesFor,
  profileStore,
  PROFILE_KEY,
  COURSE_SETTINGS_KEY,
} from "./store";
import { handleStorageEvent, store } from "../store/store";

test("T12: ContextIsolationCoordinator flushes pending state and issues monotonic tokens", () => {
  const coordinator = new ContextIsolationCoordinator();

  const ctx1 = { profileId: "learner-1", courseId: "primary-starter" };
  const { token: t1, controller: c1 } = coordinator.switchContext(ctx1);
  assert.equal(typeof t1, "number");
  assert.equal(c1.signal.aborted, false);
  assert.equal(coordinator.isValid(t1, ctx1), true);

  // Switch to another learner
  const ctx2 = { profileId: "learner-2", courseId: "primary-starter" };
  const { token: t2, controller: c2 } = coordinator.switchContext(ctx2);
  assert.equal(t2 > t1, true, "tokens must increase monotonically");
  assert.equal(c1.signal.aborted, true, "previous abort controller must be aborted");
  assert.equal(c2.signal.aborted, false);

  // Old token is no longer valid
  assert.equal(coordinator.isValid(t1, ctx1), false);
  assert.equal(coordinator.isValid(t2, ctx2), true);
});

test("T12: delayed async responses from Learner A cannot mutate Learner B's context", async () => {
  const coordinator = new ContextIsolationCoordinator();

  const learnerA = { profileId: "learner-a", courseId: "primary-starter" };
  const { token: tokenA } = coordinator.switchContext(learnerA);

  let learnerAStateCommitted = false;
  let learnerBStateCommitted = false;

  // Simulate an async operation started by Learner A
  const slowTaskA = new Promise<string>((resolve) => {
    setTimeout(() => resolve("data-for-a"), 20);
  });

  // Switch to Learner B before slowTaskA finishes
  const learnerB = { profileId: "learner-b", courseId: "primary-starter" };
  const { token: tokenB } = coordinator.switchContext(learnerB);

  // Run Learner B's task
  if (coordinator.isValid(tokenB, learnerB)) {
    learnerBStateCommitted = true;
  }

  // Awaits Task A completion
  const resultA = await slowTaskA;
  if (coordinator.isValid(tokenA, { profileId: "learner-a" })) {
    learnerAStateCommitted = true;
  }

  assert.equal(resultA, "data-for-a");
  assert.equal(
    learnerAStateCommitted,
    false,
    "Learner A's delayed response must NOT commit after switching to Learner B",
  );
  assert.equal(learnerBStateCommitted, true);
});

test("T12: delayed async responses from Course X cannot mutate Course Y's context", async () => {
  const coordinator = new ContextIsolationCoordinator();

  const courseX = { profileId: "learner-1", courseId: "primary-starter" };
  const { token: tokenX } = coordinator.switchContext(courseX);

  let courseXCommitted = false;

  const slowTaskX = new Promise<string>((resolve) => {
    setTimeout(() => resolve("course-x-entries"), 15);
  });

  // Switch to Course Y
  const courseY = { profileId: "learner-1", courseId: "hanzi-starter" };
  coordinator.switchContext(courseY);

  await slowTaskX;
  if (coordinator.isValid(tokenX, { courseId: "primary-starter" })) {
    courseXCommitted = true;
  }

  assert.equal(
    courseXCommitted,
    false,
    "Course X's delayed response must NOT commit after switching to Course Y",
  );
});

test("T12: multi-tab storage event updates active profiles and learner list", () => {
  const originalProfileId = profileStore.get().activeProfileId;

  // Simulate another tab saving updated profiles
  const remoteProfilesPayload = {
    version: 1,
    activeProfileId: "learner-tab-2",
    profiles: [
      { id: "learner-tab-2", nickname: "小航海家", createdAt: 1000 },
      { id: "learner-default", nickname: "小小探索家", createdAt: 0 },
    ],
  };

  const handled = handleProfileStorageEvent({
    key: PROFILE_KEY,
    newValue: JSON.stringify(remoteProfilesPayload),
  });

  assert.equal(handled, true);
  const current = profileStore.get();
  assert.equal(current.activeProfileId, "learner-tab-2");
  assert.equal(current.profiles.length, 2);
  assert.equal(current.profiles[0].nickname, "小航海家");

  // Restore
  profileStore.select(originalProfileId);
});

test("T12: multi-tab storage event updates course preferences for specific learner × course", () => {
  const targetProfileId = profileStore.get().activeProfileId;

  const remoteSettingsPayload = {
    version: 1,
    coursePreferences: {
      [`${targetProfileId}:primary-starter`]: {
        englishCount: 5,
        hanziCount: 2,
        slow: false,
      },
    },
  };

  const handled = handleProfileStorageEvent({
    key: COURSE_SETTINGS_KEY,
    newValue: JSON.stringify(remoteSettingsPayload),
  });

  assert.equal(handled, true);
  const prefs = preferencesFor(profileStore.get(), targetProfileId, "primary-starter");
  assert.equal(prefs.englishCount, 5);
  assert.equal(prefs.slow, false);
});

test("T12: multi-tab storage event in store updates settings and progress safely", () => {
  const currentTheme = store.get().settings.theme;

  // Another tab changes theme to light
  const handled = handleStorageEvent({
    key: "word-atlas:settings",
    newValue: JSON.stringify({
      ...store.get().settings,
      theme: "light",
    }),
  });

  assert.equal(handled, true);
  assert.equal(store.get().settings.theme, "light");

  // Restore
  store.settings({ theme: currentTheme });
});

test("T12: malformed multi-tab storage events are safely ignored", () => {
  // Corrupt JSON
  assert.equal(
    handleProfileStorageEvent({
      key: PROFILE_KEY,
      newValue: "not-json{",
    }),
    false,
  );

  // Missing newValue (key deleted)
  assert.equal(
    handleProfileStorageEvent({
      key: PROFILE_KEY,
      newValue: null,
    }),
    false,
  );

  // Irrelevant key
  assert.equal(
    handleProfileStorageEvent({
      key: "some-other-app:key",
      newValue: JSON.stringify({ foo: "bar" }),
    }),
    false,
  );

  // Invalid data structure
  assert.equal(
    handleStorageEvent({
      key: "word-atlas:settings",
      newValue: "broken{json",
    }),
    false,
  );
});

test("T12: contextCoordinator.selectLearner flushes and updates coordinator context", () => {
  const created = profileStore.add("乐乐");
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const { token, controller } = contextCoordinator.selectLearner(created.profile.id);
  assert.equal(typeof token, "number");
  assert.equal(controller.signal.aborted, false);
  assert.equal(contextCoordinator.getCurrentContext().profileId, created.profile.id);
  assert.equal(contextCoordinator.isValid(token, { profileId: created.profile.id }), true);

  // Clean up
  profileStore.select("learner-default");
});
