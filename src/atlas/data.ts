import type {
  Atlas,
  Course,
  CourseLoadOptions,
  CourseManifest,
  EnglishEntry,
  Entry,
  IndexRow,
  LearningEntry,
  MediaKind,
  WordRef,
} from "./types";
import { isLearningEntry, MEDIA } from "./types";
import { findCourse } from "../courses/registry";

export const getBaseUrl = () => {
  const metaUrl = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL;
  return (metaUrl || "/").replace(/\/$/, "");
};
const url = (p: string) => `${getBaseUrl()}/atlas/${p}`;

interface IndexFile {
  id: string;
  name: string;
  count: number;
  examples: number;
  illustrated: number;
  chunk: number;
  topics: [string, string][];
  cefr: string[];
  words: IndexRow[];
}

/** Rows from the legacy private catalog served only by the local dev server. */
interface PrivateWord {
  id: string;
  seq: number;
  word: string;
  meaning: string;
  phonetic: string;
  sentence: string;
  translation: string;
  hint: string;
  image?: string | null;
  uk?: string | null;
  us?: string | null;
  sentenceAudio?: string | null;
}

export function entryToEnglishEntry(e: Entry, manifest?: CourseManifest): EnglishEntry {
  const primaryExample = e.ex[0] ?? { en: "", zh: "" };
  const meaning = e.senses.map((s) => (s.pos ? `${s.pos} ${s.zh}` : s.zh)).join("；") || e.w;
  const hasImg = !!(e.m & MEDIA.img);
  const hasUk = !!(e.m & MEDIA.uk);
  const hasUs = !!(e.m & MEDIA.us);
  const hasEx = !!(e.m & MEDIA.ex);

  const image = e.media?.img !== undefined ? e.media.img : hasImg ? `atlas/img/${e.id}.webp` : null;
  const recording =
    e.media?.uk !== undefined
      ? e.media.uk
      : hasUk
        ? `atlas/audio/uk/${e.id}.mp3`
        : hasUs
          ? `atlas/audio/us/${e.id}.mp3`
          : null;
  const exampleRecording =
    e.media?.ex !== undefined ? e.media.ex : hasEx ? `atlas/audio/ex/${e.id}.mp3` : null;

  return {
    kind: "english",
    id: e.id,
    topicId: e.topic,
    word: e.w,
    meaning,
    example: {
      text: primaryExample.en,
      translation: primaryExample.zh,
    },
    media: {
      image,
      recording,
      exampleRecording,
      locale: "en-GB",
      source: manifest?.attribution ?? "Word Atlas contributors（词光）· CC BY 4.0",
    },
    // Legacy material remains usable, but it has not gone through the new
    // child-course review workflow. Do not let the adapter manufacture approval.
    reviewStatus: "legacy-unreviewed",
    caregiverTip: e.tip,
  };
}

export function resolveMediaUrl(
  ref: WordRef | Entry | LearningEntry,
  kind: MediaKind | "img" | "thumb" = "img",
  size: "thumb" | "full" = "full",
): string | null {
  const base = getBaseUrl();
  if (isLearningEntry(ref)) {
    if (kind === "img" || kind === "thumb") {
      if (!ref.media.image) return null;
      return ref.media.image.startsWith("http") || ref.media.image.startsWith("/")
        ? ref.media.image
        : `${base}/${ref.media.image}`;
    }
    const audioPath =
      kind === "ex" || kind === "example"
        ? ref.media.exampleRecording
        : ref.media.recording;
    if (!audioPath) return null;
    return audioPath.startsWith("http") || audioPath.startsWith("/")
      ? audioPath
      : `${base}/${audioPath}`;
  }

  // Legacy Entry or WordRef
  const m = "media" in ref && typeof ref.media === "number" ? ref.media : (ref as Entry).m;
  if (kind === "img" || kind === "thumb") {
    const custom = "media" in ref && typeof ref.media === "object" ? (ref as Entry).media?.img : undefined;
    if (custom !== undefined) return custom ?? null;
    return m & MEDIA.img ? `${base}/atlas/${size === "thumb" ? "thumb" : "img"}/${ref.id}.webp` : null;
  }

  const legacyKind = kind === "recording" ? "uk" : kind === "example" ? "ex" : kind;
  const custom =
    "media" in ref && typeof ref.media === "object"
      ? (ref as Entry).media?.[legacyKind as "uk" | "us" | "ex" | "ex2"]
      : undefined;
  if (custom !== undefined) return custom ?? null;
  const bit = MEDIA[legacyKind as keyof typeof MEDIA];
  return bit && m & bit ? `${base}/atlas/audio/${legacyKind}/${ref.id}.mp3` : null;
}

/** Preview media uses an immutable, course-versioned copy; legacy URLs remain unchanged. */
export function versionedCourseMedia(mediaUrl: string | null, manifest: CourseManifest): string | null {
  if (!mediaUrl) return null;
  if (/^(?:https?:)?\/\//i.test(mediaUrl)) return mediaUrl;
  const base = getBaseUrl();
  const prefix = `${base}/`;
  if (!mediaUrl.startsWith(prefix)) return mediaUrl;
  const relative = mediaUrl.slice(prefix.length);
  if (!/^[a-z0-9_/-]+\.(webp|png|jpg|mp3|wav|ogg)$/i.test(relative) || relative.split("/").includes("..")) return mediaUrl;
  return `${base}/courses/${encodeURIComponent(manifest.id)}/${encodeURIComponent(manifest.version)}/media/${relative}`;
}

export async function loadOpenAtlas(options?: CourseLoadOptions): Promise<Atlas> {
  const signal = options?.signal;
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const res = await fetch(url("index.json"), { signal });
  if (!res.ok) throw new Error(`词库索引加载失败（${res.status}）`);
  const idx = (await res.json()) as IndexFile;
  if (!idx || typeof idx !== "object" || !Array.isArray(idx.words) || typeof idx.chunk !== "number") {
    throw new Error("词库索引格式错误");
  }

  const words: WordRef[] = idx.words.map((r, order) => ({
    id: r[0],
    word: r[1],
    zh: r[2],
    ipa: r[3],
    cefr: r[4],
    topic: r[5],
    media: r[6],
    order,
  }));
  const byId = new Map(words.map((w) => [w.id, w]));
  const cache = new Map<string, Entry>();
  const pending = new Map<number, Promise<void>>();

  const manifest: CourseManifest = findCourse("word-atlas-open")?.manifest ?? {
    id: "word-atlas-open",
    version: "legacy-v2",
    title: "雅思英语",
    subject: "english",
    stage: "ielts",
    status: "available",
    description: "一词一画，在语境里积累词汇。",
    attribution: "Word Atlas contributors（词光）· CC BY 4.0",
  };

  const loadChunk = (n: number) => {
    let p = pending.get(n);
    if (!p) {
      p = fetch(url(`entries/${n}.json`), { signal })
        .then((r) => {
          if (!r.ok) throw new Error(`词条加载失败（${r.status}）`);
          return r.json() as Promise<Entry[]>;
        })
        .then((list) => {
          if (!Array.isArray(list)) throw new Error("词条数据格式错误");
          list.forEach((e) => cache.set(e.id, e));
        })
        .catch((e) => {
          pending.delete(n);
          throw e;
        });
      pending.set(n, p);
    }
    return p;
  };

  const atlas: Atlas = {
    id: idx.id,
    name: idx.name,
    kind: "open",
    count: idx.count,
    examples: idx.examples,
    illustrated: idx.illustrated,
    topics: idx.topics,
    cefr: idx.cefr,
    words,
    byId,
    manifest,
    peek: (id) => cache.get(id),
    async entry(id) {
      const hit = cache.get(id);
      if (hit) return hit;
      const ref = byId.get(id);
      if (!ref) throw new Error(`没有找到词条 ${id}`);
      await loadChunk(Math.floor(ref.order / idx.chunk));
      const e = cache.get(id);
      if (!e) throw new Error(`没有找到词条 ${id}`);
      return e;
    },
    toLearningEntry: (entry) => entryToEnglishEntry(entry, manifest),
    async asLearningEntry(id) {
      const e = await atlas.entry(id);
      return entryToEnglishEntry(e, manifest);
    },
    img: (ref, size = "full") => resolveMediaUrl(ref, "img", size),
    audio: (ref, kind) => resolveMediaUrl(ref, kind),
  };

  return atlas;
}

export async function loadPrivateAtlas(
  open: Atlas | null,
  options?: CourseLoadOptions,
): Promise<Atlas | null> {
  const signal = options?.signal;
  if (signal?.aborted) {
    throw abortError();
  }
  let res: Response;
  try {
    res = await fetch("/local/catalog.json", { cache: "no-store", signal });
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      throw error;
    }
    return null;
  }
  if (!res.ok || !(res.headers.get("content-type") || "").includes("json")) return null;
  const cat = (await res.json()) as { id: string; name: string; words: PrivateWord[] };
  if (!cat || typeof cat !== "object" || !Array.isArray(cat.words)) return null;

  const manifest: CourseManifest = {
    id: cat.id || "word-atlas-private",
    version: "legacy-private",
    title: cat.name || "私有词库",
    subject: "english",
    stage: "ielts",
    status: "available",
    description: "本地开发私有词库。",
    attribution: "Word Atlas contributors（词光）· 本地私有",
  };

  const entries = new Map<string, Entry>();
  const twins = new Map(open?.words.map((o) => [o.word.toLowerCase(), o]) ?? []);
  const words: WordRef[] = cat.words.map((w, order) => {
    const twin = twins.get(w.word.toLowerCase());
    const pos = (w.meaning.match(/·\s*([a-z]+\.)\s*$/) || [])[1] || "";
    const zh = w.meaning.replace(/\s*·\s*[a-z]+\.\s*$/, "");
    entries.set(w.id, {
      id: w.id,
      w: w.word,
      uk: w.phonetic,
      us: "",
      senses: [{ pos, zh, en: "" }],
      ex: w.sentence ? [{ en: w.sentence, zh: w.translation }] : [],
      col: [],
      fam: [],
      syn: [],
      ant: [],
      tip: w.hint,
      cefr: twin ? (open?.cefr[twin.cefr] ?? "B1") : "B1",
      topic: twin ? (open?.topics[twin.topic]?.[0] ?? "thinking") : "thinking",
      m: (w.image ? MEDIA.img : 0) | (w.uk ? MEDIA.uk : 0) | (w.us ? MEDIA.us : 0) | (w.sentenceAudio ? MEDIA.ex : 0),
      media: { img: w.image, uk: w.uk, us: w.us, ex: w.sentenceAudio },
    });
    return {
      id: w.id,
      word: w.word,
      zh: `${pos} ${zh}`.trim(),
      ipa: w.phonetic,
      cefr: twin?.cefr ?? 2,
      topic: twin?.topic ?? 16,
      media: entries.get(w.id)!.m,
      order,
    };
  });
  const byId = new Map(words.map((w) => [w.id, w]));

  const atlas: Atlas = {
    id: cat.id,
    name: cat.name,
    kind: "private",
    count: words.length,
    examples: [...entries.values()].reduce((n, e) => n + e.ex.length, 0),
    illustrated: words.filter((w) => w.media & MEDIA.img).length,
    topics: open?.topics ?? [["thinking", "综合"]],
    cefr: open?.cefr ?? ["A1", "A2", "B1", "B2", "C1", "C2"],
    words,
    byId,
    manifest,
    peek: (id) => entries.get(id),
    entry: async (id) => {
      const e = entries.get(id);
      if (!e) throw new Error(`没有找到词条 ${id}`);
      return e;
    },
    toLearningEntry: (entry) => entryToEnglishEntry(entry, manifest),
    async asLearningEntry(id) {
      const e = await atlas.entry(id);
      return entryToEnglishEntry(e, manifest);
    },
    img: (ref, size = "full") => resolveMediaUrl(ref, "img", size),
    audio: (ref, kind) => resolveMediaUrl(ref, kind),
  };

  return atlas;
}

export function createLegacyCourseAdapter(atlas: Atlas): Course {
  return {
    manifest: atlas.manifest,
    kind: "legacy",
    count: atlas.count,
    peek: (id) => atlas.peek(id),
    entry: (id) => atlas.entry(id),
    img: (ref, size = "full") => resolveMediaUrl(ref, "img", size),
    audio: (ref, kind = "recording") => resolveMediaUrl(ref, kind),
    legacyAtlas: atlas,
    asLearningEntry: (id) => atlas.asLearningEntry(id),
  };
}

const courseCache = new Map<string, Course>();
const pendingCourseLoads = new Map<string, Promise<Course>>();

function abortError() {
  return new DOMException("Aborted", "AbortError");
}

/**
 * A caller may leave a shared course load without cancelling it for every
 * other caller. This prevents an unmount from poisoning the module cache.
 */
function waitForCourse<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export async function loadCourse(courseId: string, options?: CourseLoadOptions): Promise<Course> {
  const signal = options?.signal;
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const cached = courseCache.get(courseId);
  if (cached) return waitForCourse(Promise.resolve(cached), signal);

  const inFlight = pendingCourseLoads.get(courseId);
  if (inFlight) return waitForCourse(inFlight, signal);

  const registration = findCourse(courseId);
  if (!registration) {
    if (courseId === "word-atlas-private" || courseId === "local-private") {
      const p = loadPrivateAtlas(options?.openAtlas ?? null)
        .then((a) => {
          if (!a) throw new Error("私有词库未提供或未开启");
          const course = createLegacyCourseAdapter(a);
          courseCache.set(courseId, course);
          return course;
        })
        .finally(() => {
          pendingCourseLoads.delete(courseId);
        });
      pendingCourseLoads.set(courseId, p);
      return waitForCourse(p, signal);
    }
    throw new Error(`未知课程：${courseId}`);
  }

  if (registration.kind === "planned") {
    throw new Error(`课程“${registration.manifest.title}”尚未开放`);
  }

  const loadPromise = (async () => {
    if (registration.kind === "legacy") {
      const atlas = await loadOpenAtlas();
      const course = createLegacyCourseAdapter(atlas);
      courseCache.set(courseId, course);
      return course;
    }

    if (registration.kind === "preview") {
      // Keep subjects in separate chunks so entering one course doesn't download the other.
      const pack = courseId === "primary-starter"
        ? (await import("../courses/primary-full")).primaryFull
        : courseId === "hanzi-starter"
          ? (await import("../courses/hanzi-full")).hanziFull
          : undefined;
      if (!pack) throw new Error(`未能找到体验课程包：${courseId}`);

      const byId = new Map(pack.entries.map((e) => [e.id, e]));
      const course: Course = {
        manifest: pack.manifest,
        kind: "preview",
        count: pack.entries.length,
        lessons: pack.lessons,
        peek: (id) => byId.get(id),
        async entry(id) {
          const hit = byId.get(id);
          if (!hit) throw new Error(`没有找到条目 ${id}`);
          return hit;
        },
        img: (ref, size = "full") => versionedCourseMedia(resolveMediaUrl(ref, "img", size), pack.manifest),
        audio: (ref, kind = "recording") => versionedCourseMedia(resolveMediaUrl(ref, kind), pack.manifest),
        async asLearningEntry(id) {
          const hit = byId.get(id);
          if (!hit) throw new Error(`没有找到条目 ${id}`);
          return hit;
        },
      };
      courseCache.set(courseId, course);
      return course;
    }

    throw new Error(`不支持的课程类型：${(registration as { kind: string }).kind}`);
  })()
    .catch((err) => {
      pendingCourseLoads.delete(courseId);
      throw err;
    })
    .finally(() => {
      pendingCourseLoads.delete(courseId);
    });

  pendingCourseLoads.set(courseId, loadPromise);
  return waitForCourse(loadPromise, signal);
}

export function clearCourseCache() {
  courseCache.clear();
  pendingCourseLoads.clear();
}

/**
 * Scoped coordinator to isolate asynchronous operations against race conditions
 * when switching learners or active courses.
 */
export class AsyncScope<TContext = unknown> {
  private currentToken = 0;
  private currentContext?: TContext;

  issue(context?: TContext): number {
    this.currentContext = context;
    return ++this.currentToken;
  }

  isValid(token: number, context?: TContext): boolean {
    if (token !== this.currentToken) return false;
    if (context !== undefined && context !== this.currentContext) return false;
    return true;
  }

  reset(): void {
    this.currentToken++;
    this.currentContext = undefined;
  }
}
