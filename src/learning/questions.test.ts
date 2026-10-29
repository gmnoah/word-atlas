import assert from "node:assert/strict";
import { test } from "node:test";
import type { EnglishEntry, HanziEntry } from "../courses/types";
import { sampleCourses } from "../courses/samples";
import {
  IELTS_POLICY,
  HANZI_PARENT_POLICY,
  PRIMARY_ADVANCED_POLICY,
  PRIMARY_STARTER_POLICY,
} from "./policy";
import { buildQuestion, evaluateQuestion } from "./questions";

test("Hanzi listening never offers a homophone as an alternative answer", () => {
  const entries = sampleCourses[1].entries.filter((entry): entry is HanziEntry => entry.kind === "hanzi");
  const target = entries.find((entry) => entry.character === "鹦")!;
  const homophone = entries.find((entry) => entry.character === "鹰")!;
  const other = entries.find((entry) => entry.character === "鸽")!;
  assert.equal(evaluateQuestion("hanzi-listen", target, [target, homophone], HANZI_PARENT_POLICY, 1), null);
  const plan = evaluateQuestion("hanzi-listen", target, [target, homophone, other], HANZI_PARENT_POLICY, 1);
  assert.ok(plan);
  assert.ok(plan.options.includes(other.id));
  assert.ok(!plan.options.includes(homophone.id));
});

test("Hanzi picture choices use visible characters, not distractor images", () => {
  const entries = sampleCourses[1].entries.filter((entry): entry is HanziEntry => entry.kind === "hanzi");
  const target = entries.find((entry) => entry.character === "山")!;
  const duplicate = { ...target, id: "hanzi-duplicate", media: { ...target.media, image: "atlas/img/other.webp" } };
  const other = { ...entries.find((entry) => entry.character === "水")!, media: { ...target.media, image: null } };
  assert.equal(evaluateQuestion("hanzi-picture", target, [target, duplicate], HANZI_PARENT_POLICY, 1), null);
  const plan = evaluateQuestion("hanzi-picture", target, [target, duplicate, other], HANZI_PARENT_POLICY, 1);
  assert.ok(plan);
  assert.equal(plan.prompt, "image");
  assert.equal(plan.answer, "text");
  assert.ok(plan.options.includes(other.id));
  assert.ok(!plan.options.includes(duplicate.id));
});

function english(
  id: string,
  word: string,
  meaning: string,
  media: { image?: string | null; recording?: string | null } = {},
): EnglishEntry {
  return {
    kind: "english",
    id,
    topicId: "test",
    word,
    meaning,
    example: { text: `This is ${word}.`, translation: `这是${meaning}。` },
    media: {
      image: media.image === undefined ? `atlas/img/${id}.webp` : media.image,
      recording: media.recording === undefined ? `atlas/audio/uk/${id}.mp3` : media.recording,
      locale: "en-GB",
      source: "test fixture",
    },
    reviewStatus: "draft",
    caregiverTip: "",
  };
}

const apple = english("en-apple", "apple", "苹果");
const banana = english("en-banana", "banana", "香蕉");
const cat = english("en-cat", "cat", "猫");
const hanzi = sampleCourses[1].entries.filter(
  (entry): entry is HanziEntry => entry.kind === "hanzi",
);

test("T15: a primary starter never receives spelling and gets exactly two unique options", () => {
  const plan = buildQuestion(
    apple,
    [apple, banana, cat],
    PRIMARY_STARTER_POLICY,
    1,
  );
  assert.ok(plan);
  assert.ok(PRIMARY_STARTER_POLICY.allowedKinds.some((kind) => kind === plan.kind));
  assert.notEqual(plan.kind, "spell");
  assert.equal(plan.options.length, 2);
  assert.equal(new Set(plan.options).size, 2);
  assert.ok(plan.options.includes(apple.id));
});

test("T15: missing audio falls back to a picture question; missing image falls back to audio", () => {
  const noAudio = english("en-no-audio", "pear", "梨", { recording: null });
  const audioPlan = buildQuestion(
    noAudio,
    [noAudio, apple, banana],
    PRIMARY_STARTER_POLICY,
    2,
  );
  assert.equal(audioPlan?.kind, "picture-word");

  const noImage = english("en-no-image", "pear", "梨", { image: null });
  const imagePlan = buildQuestion(
    noImage,
    [noImage, apple, banana],
    PRIMARY_STARTER_POLICY,
    3,
  );
  assert.equal(imagePlan?.kind, "listen-word");
});

test("T15: a target with no usable media or no second option produces no bad question", () => {
  const blank = english("en-blank", "ink", "墨水", { image: null, recording: null });
  assert.equal(
    buildQuestion(blank, [blank, apple, banana], PRIMARY_STARTER_POLICY, 4),
    null,
  );
  assert.equal(buildQuestion(apple, [apple], PRIMARY_STARTER_POLICY, 5), null);
});

test("T15: image options without images are excluded instead of rendered blank", () => {
  const noImageDistractor = english("en-missing", "pear", "梨", { image: null });
  const plan = evaluateQuestion(
    "listen-picture",
    apple,
    [apple, noImageDistractor, banana],
    PRIMARY_STARTER_POLICY,
    6,
  );
  assert.ok(plan);
  assert.ok(plan.options.includes(apple.id));
  assert.ok(plan.options.includes(banana.id));
  assert.ok(!plan.options.includes(noImageDistractor.id));
});

test("T15: duplicate answer labels are never used as distractors", () => {
  const twin = english("en-twin", "apple", "苹果");
  const plan = evaluateQuestion(
    "meaning",
    apple,
    [apple, twin, banana],
    IELTS_POLICY,
    7,
  );
  assert.ok(plan);
  assert.ok(plan.options.includes(apple.id));
  assert.ok(plan.options.includes(banana.id));
  assert.ok(!plan.options.includes(twin.id));
});

test("T15: different distractor IDs cannot duplicate text or image answers", () => {
  const twin = english("en-banana-twin", "BANANA", "香蕉", { image: banana.media.image });
  for (const kind of ["picture-word", "listen-picture"] as const) {
    const plan = evaluateQuestion(kind, apple, [apple, banana, twin, cat], {
      ...PRIMARY_STARTER_POLICY, optionCount: 4,
    }, 7);
    assert.ok(plan);
    assert.equal(plan.options.length, 3);
    assert.ok(plan.options.includes(apple.id));
    assert.ok(plan.options.includes(cat.id));
    assert.equal(plan.options.filter((id) => id === banana.id || id === twin.id).length, 1);
  }
});

test("T15: a malformed policy still cannot create a one-option question", () => {
  const malformed = {
    ...PRIMARY_STARTER_POLICY,
    minOptions: 1,
    optionCount: 1,
  };
  const plan = evaluateQuestion("picture-word", apple, [apple, banana], malformed, 10);
  assert.ok(plan);
  assert.equal(plan.options.length, 2);
});

test("T15: Hanzi without recordings falls back to a valid visual or question prompt", () => {
  const first = hanzi[0];
  assert.ok(first);
  const plan = buildQuestion(first, hanzi, HANZI_PARENT_POLICY, 8);
  assert.ok(plan);
  assert.notEqual(plan.kind, "hanzi-listen");
  assert.ok(["hanzi-picture", "hanzi-question"].includes(plan.kind));
  assert.equal(plan.options.length, 2);
  assert.equal(new Set(plan.options).size, 2);
  assert.ok(plan.options.includes(first.id));
});

test("T15: spelling declares its input capability and expected text", () => {
  const plan = evaluateQuestion(
    "spell",
    apple,
    [apple, banana],
    PRIMARY_ADVANCED_POLICY,
    9,
  );
  assert.ok(plan);
  assert.equal(plan.answer, "input");
  assert.equal(plan.expected, "apple");
  assert.deepEqual(plan.options, []);
});
