import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import {
  AsyncScope,
  clearCourseCache,
  entryToEnglishEntry,
  loadCourse,
  loadOpenAtlas,
  loadPrivateAtlas,
  resolveMediaUrl,
  versionedCourseMedia,
} from "./data";
import type { Atlas, Entry, WordRef } from "./types";
import { MEDIA } from "./types";

/** Mock fetch to serve real static files from public/atlas for Node tests */
function withAtlasFetch(fn: () => Promise<void>) {
  return async () => {
    clearCourseCache();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      const url = String(input);
      if (url.includes("/atlas/index.json")) {
        const data = fs.readFileSync("public/atlas/index.json", "utf8");
        return new Response(data, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      const chunkMatch = url.match(/\/atlas\/entries\/(\d+)\.json/);
      if (chunkMatch) {
        const file = `public/atlas/entries/${chunkMatch[1]}.json`;
        if (fs.existsSync(file)) {
          return new Response(fs.readFileSync(file, "utf8"), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      }
      return new Response("Not found", { status: 404 });
    };

    try {
      await fn();
    } finally {
      globalThis.fetch = originalFetch;
      clearCourseCache();
    }
  };
}

test(
  "T07: loadCourse('word-atlas-open') bridges legacy IELTS atlas to unified Course interface",
  withAtlasFetch(async () => {
    const course = await loadCourse("word-atlas-open");

    assert.equal(course.manifest.id, "word-atlas-open");
    assert.equal(course.manifest.title, "雅思英语");
    assert.equal(course.manifest.subject, "english");
    assert.equal(course.manifest.stage, "ielts");
    assert.equal(course.manifest.status, "available");
    assert.equal(course.count, 7298);
    assert.ok(course.legacyAtlas, "legacy atlas instance is retained");
    assert.equal(course.legacyAtlas?.words.length, 7298);

    // Verify IELTS resource paths are 100% unchanged
    const wordRef: WordRef = course.legacyAtlas!.words[0];
    const imgUrl = course.img(wordRef);
    const audioUrl = course.audio(wordRef, "uk");
    assert.equal(imgUrl, `/atlas/img/${wordRef.id}.webp`);
    assert.equal(audioUrl, `/atlas/audio/uk/${wordRef.id}.mp3`);

    // Entry loading
    assert.equal(course.peek("apple"), undefined);
    const entry = (await course.entry("apple")) as Entry;
    assert.equal(entry.id, "apple");
    assert.equal(entry.w, "apple");
    assert.equal(course.peek("apple")?.id, "apple");

    // Unified LearningEntry adapter
    const englishEntry = await course.asLearningEntry!("apple");
    assert.equal(englishEntry.kind, "english");
    assert.equal(englishEntry.id, "apple");
    assert.equal(englishEntry.word, "apple");
    assert.equal(englishEntry.reviewStatus, "legacy-unreviewed");
    assert.equal(englishEntry.media.image, "atlas/img/apple.webp");
    assert.equal(englishEntry.media.recording, "atlas/audio/uk/apple.mp3");
  }),
);

test(
  "T07: preview sample courses load under unified boundary without requesting IELTS index",
  async () => {
    clearCourseCache();
    let requestedIeltsIndex = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      if (String(input).includes("atlas/index.json")) {
        requestedIeltsIndex = true;
      }
      return new Response("Not found", { status: 404 });
    };

    try {
      // Primary starter
      const primary = await loadCourse("primary-starter");
      assert.equal(primary.manifest.id, "primary-starter");
      assert.equal(primary.manifest.subject, "english");
      assert.equal(primary.manifest.stage, "primary");
      assert.equal(primary.count, 300);
      assert.equal(primary.lessons?.length, 33);

      const apple = await primary.entry("en-apple");
      assert.equal(apple.id, "en-apple");
      assert.equal(primary.img(apple), "/courses/primary-starter/0.4.0-draft/media/atlas/img/apple.webp");
      assert.equal(primary.audio(apple, "recording"), "/courses/primary-starter/0.4.0-draft/media/atlas/audio/uk/apple.mp3");
      assert.notEqual(primary.img(apple), versionedCourseMedia("/atlas/img/apple.webp", { ...primary.manifest, version: "0.2.0" }));
      assert.equal(versionedCourseMedia("https://example.com/signed?x=1", primary.manifest), "https://example.com/signed?x=1");

      // Hanzi starter
      const hanzi = await loadCourse("hanzi-starter");
      assert.equal(hanzi.manifest.id, "hanzi-starter");
      assert.equal(hanzi.manifest.subject, "hanzi");
      assert.equal(hanzi.manifest.stage, "preschool");
      assert.equal(hanzi.count, 300);

      const shan = await hanzi.entry("hanzi-u5c71");
      assert.equal(shan.id, "hanzi-u5c71");

      assert.equal(
        requestedIeltsIndex,
        false,
        "preview courses must not load IELTS index",
      );
    } finally {
      globalThis.fetch = originalFetch;
      clearCourseCache();
    }
  },
);

test("T07: planned and unknown courses reject with clear, safe error messages", async () => {
  clearCourseCache();

  await assert.rejects(
    async () => loadCourse("middle-english"),
    /课程“初中英语”尚未开放/,
  );

  await assert.rejects(
    async () => loadCourse("high-english"),
    /课程“高中英语”尚未开放/,
  );

  await assert.rejects(
    async () => loadCourse("unknown-course"),
    /未知课程：unknown-course/,
  );

  await assert.rejects(async () => loadCourse(""), /未知课程：/);
});

test("T07: concurrent calls deduplicate in-flight loads and retry on error", async () => {
  clearCourseCache();
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    fetchCount++;
    const url = String(input);
    if (url.includes("/atlas/index.json")) {
      return new Response(fs.readFileSync("public/atlas/index.json", "utf8"), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("Not found", { status: 404 });
  };

  try {
    // Two concurrent requests for the same course should share one in-flight promise
    const [c1, c2] = await Promise.all([
      loadCourse("word-atlas-open"),
      loadCourse("word-atlas-open"),
    ]);
    assert.equal(c1, c2);
    assert.equal(fetchCount, 1, "fetch called exactly once for concurrent requests");

    // Clear cache, test failure cleanup
    clearCourseCache();
    globalThis.fetch = async () => new Response("Server error", { status: 500 });
    await assert.rejects(async () => loadCourse("word-atlas-open"), /500/);

    // After failure, pending cache must be cleared so subsequent call can retry
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/atlas/index.json")) {
        return new Response(fs.readFileSync("public/atlas/index.json", "utf8"), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("Not found", { status: 404 });
    };
    const retried = await loadCourse("word-atlas-open");
    assert.equal(retried.manifest.id, "word-atlas-open");
  } finally {
    globalThis.fetch = originalFetch;
    clearCourseCache();
  }
});

test("T07: AbortSignal lets one caller leave an in-flight shared load without poisoning cache", async () => {
  clearCourseCache();
  const controller = new AbortController();
  const originalFetch = globalThis.fetch;
  let releaseFetch: (() => void) | undefined;
  let fetchCount = 0;
  let markStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });

  globalThis.fetch = async (input: RequestInfo | URL) => {
    fetchCount++;
    markStarted?.();
    await new Promise<void>((resolve) => {
      releaseFetch = resolve;
    });
    if (String(input).includes("atlas/index.json")) {
      return new Response(fs.readFileSync("public/atlas/index.json", "utf8"), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("Not found", { status: 404 });
  };

  try {
    const abandoned = loadCourse("word-atlas-open", { signal: controller.signal });
    await started;
    controller.abort();
    await assert.rejects(abandoned, (err: unknown) => (err as Error).name === "AbortError");

    releaseFetch?.();
    const course = await loadCourse("word-atlas-open");
    assert.equal(course.manifest.id, "word-atlas-open");
    assert.equal(fetchCount, 1, "the shared request completes and is cached once");
  } finally {
    globalThis.fetch = originalFetch;
    clearCourseCache();
  }
});

test("T07: private course retains matching open-atlas CEFR and topic metadata", async () => {
  clearCourseCache();
  const originalFetch = globalThis.fetch;
  const open = {
    words: [{ id: "cat", word: "cat", zh: "猫", ipa: "", cefr: 4, topic: 1, media: 0, order: 0 }],
    cefr: ["A1", "A2", "B1", "B2", "C1", "C2"],
    topics: [["general", "综合"], ["animals", "动物"]],
  } as unknown as Atlas;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: "word-atlas-private",
        name: "本地私有词库",
        words: [
          {
            id: "private-cat",
            seq: 1,
            word: "cat",
            meaning: "猫 · n.",
            phonetic: "/kæt/",
            sentence: "The cat is sleeping.",
            translation: "猫在睡觉。",
            hint: "看看窗边的小猫。",
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  try {
    const course = await loadCourse("word-atlas-private", { openAtlas: open });
    const entry = (await course.entry("private-cat")) as Entry;
    assert.equal(entry.cefr, "C1");
    assert.equal(entry.topic, "animals");
    assert.equal(course.legacyAtlas?.topics[1]?.[0], "animals");

    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      () => loadPrivateAtlas(open, { signal: controller.signal }),
      (error: unknown) => (error as Error).name === "AbortError",
    );
  } finally {
    globalThis.fetch = originalFetch;
    clearCourseCache();
  }
});

test("T07: AsyncScope isolates asynchronous operations when switching learners/courses", () => {
  const scope = new AsyncScope<string>();

  const tokenLearnerA = scope.issue("learner-A");
  assert.equal(scope.isValid(tokenLearnerA, "learner-A"), true);

  // Learner switches to B
  const tokenLearnerB = scope.issue("learner-B");
  assert.equal(scope.isValid(tokenLearnerB, "learner-B"), true);

  // Delayed callback from Learner A must now be rejected
  assert.equal(
    scope.isValid(tokenLearnerA, "learner-A"),
    false,
    "delayed request from learner A is invalidated after switching to learner B",
  );
  assert.equal(scope.isValid(tokenLearnerA, "learner-B"), false);

  // Reset invalidates everything
  scope.reset();
  assert.equal(scope.isValid(tokenLearnerB, "learner-B"), false);
});

test("T07: untrusted / malformed index and chunk data are caught cleanly", async () => {
  const originalFetch = globalThis.fetch;

  try {
    // Malformed index JSON
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ notAnIndex: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    await assert.rejects(
      async () => loadOpenAtlas(),
      /词库索引格式错误/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("T07: entryToEnglishEntry correctly formats IELTS entry senses, tips and media", () => {
  const dummyEntry: Entry = {
    id: "test-word",
    w: "test",
    uk: "test_ipa",
    us: "",
    senses: [
      { pos: "n.", zh: "测试", en: "a test" },
      { pos: "v.", zh: "检验", en: "to examine" },
    ],
    ex: [{ en: "This is a test.", zh: "这是一个测试。" }],
    col: [],
    fam: [],
    syn: [],
    ant: [],
    tip: "Tip for caregivers",
    cefr: "B1",
    topic: "general",
    m: MEDIA.img | MEDIA.uk | MEDIA.ex,
  };

  const adapted = entryToEnglishEntry(dummyEntry);
  assert.equal(adapted.kind, "english");
  assert.equal(adapted.id, "test-word");
  assert.equal(adapted.word, "test");
  assert.equal(adapted.meaning, "n. 测试；v. 检验");
  assert.equal(adapted.example.text, "This is a test.");
  assert.equal(adapted.example.translation, "这是一个测试。");
  assert.equal(adapted.media.image, "atlas/img/test-word.webp");
  assert.equal(adapted.media.recording, "atlas/audio/uk/test-word.mp3");
  assert.equal(adapted.media.exampleRecording, "atlas/audio/ex/test-word.mp3");
  assert.equal(adapted.caregiverTip, "Tip for caregivers");
  assert.equal(adapted.reviewStatus, "legacy-unreviewed");
});

test("T07: resolveMediaUrl correctly handles learning entries, legacy entries and custom paths", () => {
  const dummyEntry: Entry = {
    id: "moon",
    w: "moon",
    uk: "mu:n",
    us: "mu:n",
    senses: [{ pos: "n.", zh: "月亮", en: "the moon" }],
    ex: [],
    col: [],
    fam: [],
    syn: [],
    ant: [],
    tip: "",
    cefr: "A1",
    topic: "nature",
    m: MEDIA.img | MEDIA.uk,
  };

  assert.equal(resolveMediaUrl(dummyEntry, "img"), "/atlas/img/moon.webp");
  assert.equal(resolveMediaUrl(dummyEntry, "thumb", "thumb"), "/atlas/thumb/moon.webp");
  assert.equal(resolveMediaUrl(dummyEntry, "uk"), "/atlas/audio/uk/moon.mp3");

  const learning = entryToEnglishEntry(dummyEntry);
  assert.equal(resolveMediaUrl(learning, "img"), "/atlas/img/moon.webp");
  assert.equal(resolveMediaUrl(learning, "recording"), "/atlas/audio/uk/moon.mp3");
});
