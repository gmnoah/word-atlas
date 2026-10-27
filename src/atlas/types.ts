import type {
  CourseManifest,
  EnglishEntry,
  HanziEntry,
  LearningEntry,
  Lesson,
  Stage,
  Subject,
} from "../courses/types";

export type {
  CourseManifest,
  EnglishEntry,
  HanziEntry,
  LearningEntry,
  Lesson,
  Stage,
  Subject,
};

export type Accent = "uk" | "us";

/** Compact row from atlas/index.json: [id, word, zh, ipa, cefr, topic, media]. */
export type IndexRow = [string, string, string, string, number, number, number];

export interface Sense {
  pos: string;
  zh: string;
  en: string;
}

export interface Example {
  en: string;
  zh: string;
}

export interface Entry {
  id: string;
  w: string;
  uk: string;
  us: string;
  senses: Sense[];
  ex: Example[];
  col: string[];
  fam: string[];
  syn: string[];
  ant: string[];
  tip: string;
  cefr: string;
  topic: string;
  /** Usage caution (register, offensiveness, spelling), shown with the entry. */
  note?: string;
  /** Media bit flags, see MEDIA. */
  m: number;
  /** Absolute media URLs for datasets that do not follow the atlas layout. */
  media?: { img?: string | null; uk?: string | null; us?: string | null; ex?: string | null; ex2?: string | null };
}

export const MEDIA = { img: 1, uk: 2, us: 4, ex: 8, ex2: 16 } as const;

export interface WordRef {
  id: string;
  word: string;
  zh: string;
  ipa: string;
  cefr: number;
  topic: number;
  media: number;
  /** Position in the learning path. */
  order: number;
}

export interface Atlas {
  id: string;
  name: string;
  kind: "open" | "private";
  count: number;
  examples: number;
  illustrated: number;
  topics: [string, string][];
  cefr: string[];
  words: WordRef[];
  byId: Map<string, WordRef>;
  /** Loads full entries; chunked for the open atlas, in-memory for private sets. */
  entry: (id: string) => Promise<Entry>;
  peek: (id: string) => Entry | undefined;
  img: (ref: WordRef | Entry, size?: "thumb" | "full") => string | null;
  audio: (ref: WordRef | Entry, kind: "uk" | "us" | "ex" | "ex2") => string | null;
  /** Registered course manifest */
  manifest: CourseManifest;
  /** Adapter converting legacy entry to unified EnglishEntry */
  toLearningEntry: (entry: Entry) => EnglishEntry;
  /** Asynchronously loads and adapts an entry to EnglishEntry */
  asLearningEntry: (id: string) => Promise<EnglishEntry>;
}

export type MediaKind = "uk" | "us" | "ex" | "ex2" | "recording" | "example";

/** Unified Course interface across legacy and new courses. */
export interface Course {
  manifest: CourseManifest;
  kind: "legacy" | "preview";
  count: number;
  peek: (id: string) => Entry | LearningEntry | undefined;
  entry: (id: string) => Promise<Entry | LearningEntry>;
  img: (ref: WordRef | Entry | LearningEntry, size?: "thumb" | "full") => string | null;
  audio: (ref: WordRef | Entry | LearningEntry, kind?: MediaKind) => string | null;
  lessons?: Lesson[];
  /** Legacy atlas reference if this course is an IELTS atlas. */
  legacyAtlas?: Atlas;
  /** Asynchronously loads and adapts an entry to LearningEntry. */
  asLearningEntry?: (id: string) => Promise<LearningEntry>;
}

export interface CourseLoadOptions {
  signal?: AbortSignal;
  /** Open atlas used only to retain topic / CEFR metadata when loading a local private atlas. */
  openAtlas?: Atlas | null;
}

export function isLearningEntry(e: unknown): e is LearningEntry {
  return (
    !!e &&
    typeof e === "object" &&
    "kind" in e &&
    ((e as { kind: string }).kind === "english" || (e as { kind: string }).kind === "hanzi")
  );
}

export function isLegacyEntry(e: unknown): e is Entry {
  return !!e && typeof e === "object" && "w" in e && "senses" in e;
}
