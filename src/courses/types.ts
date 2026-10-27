/** New courses are independent of the legacy IELTS Atlas/Entry contract. */
export type Subject = "english" | "hanzi";
export type Stage = "ielts" | "primary" | "middle" | "high" | "preschool";

export interface LearnerProfile {
  id: string;
  nickname: string;
  createdAt: number;
}

export interface ContentMedia {
  /** Paths relative to the app base; null explicitly means unavailable. */
  image: string | null;
  recording: string | null;
  /** Sentence recording must match this entry's exact sample sentence. */
  exampleRecording?: string | null;
  locale: "en-GB" | "zh-CN";
  source: string;
}

interface EntryBase {
  id: string;
  topicId: string;
  media: ContentMedia;
  /** `legacy-unreviewed` means imported historic material without a new-course review record. */
  reviewStatus: "draft" | "approved" | "legacy-unreviewed";
  humanReview?: {
    reviewer: string;
    reviewedAt: string;
    text: boolean;
    image: boolean;
    audio: boolean;
  };
  caregiverTip: string;
}

export interface EnglishEntry extends EntryBase {
  kind: "english";
  word: string;
  meaning: string;
  example: {
    text: string;
    translation: string;
    /** Editor-declared form in this exact sentence, e.g. apple → apples. */
    targetForm?: string;
  };
}

export interface HanziEntry extends EntryBase {
  kind: "hanzi";
  character: string;
  pinyin: string;
  phrase: string;
  sentence: string;
  question: string;
}

export type LearningEntry = EnglishEntry | HanziEntry;

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  entryIds: string[];
}

export interface CourseManifest {
  id: string;
  version: string;
  title: string;
  subject: Subject;
  stage: Stage;
  status: "available" | "preview" | "planned";
  description: string;
  attribution: string;
}

export interface SampleCourse {
  manifest: CourseManifest;
  lessons: Lesson[];
  entries: LearningEntry[];
}

/** Contract for future persisted progress. The preview never writes this data. */
export interface ProgressIdentity {
  profileId: string;
  courseId: string;
  contentId: string;
}

export type AttemptSupport = "independent" | "hinted" | "assisted";

export type AttemptResult =
  | {
      outcome: "answered";
      contentId: string;
      correct: boolean;
      support: AttemptSupport;
    }
  | { outcome: "skipped" | "resource-error"; contentId: string };

export const entryLabel = (entry: LearningEntry) =>
  entry.kind === "english" ? entry.word : entry.character;
