import type { CourseManifest } from "./types";

const attribution = "Word Atlas contributors（词光）· CC BY 4.0";
export const primaryManifest: CourseManifest & { status: "preview" } = {
  id: "primary-starter",
  version: "0.1.0-draft",
  title: "基础英语",
  subject: "english",
  stage: "primary",
  status: "preview",
  description: "从身边的小事，认识一个新单词。",
  attribution,
};
export const hanziManifest: CourseManifest & { status: "preview" } = {
  id: "hanzi-starter",
  version: "0.1.0-draft",
  title: "汉字启蒙",
  subject: "hanzi",
  stage: "preschool",
  status: "preview",
  description: "和孩子一起，在生活里遇见汉字。",
  attribution,
};
interface Presentation {
  cover: string;
  eyebrow: string;
  badge: string;
}
export type CourseRegistration = Presentation &
  (
    | {
        kind: "legacy";
        manifest: CourseManifest & { status: "available" };
        href: "#/";
        count: number;
      }
    | { kind: "preview"; manifest: CourseManifest & { status: "preview" } }
    | { kind: "planned"; manifest: CourseManifest & { status: "planned" } }
  );

/** Metadata only. Registering a course does not load its entries or media. */
export const courseRegistry: readonly CourseRegistration[] = [
  {
    kind: "legacy",
    manifest: {
      id: "word-atlas-open",
      version: "legacy-v2",
      title: "雅思英语",
      subject: "english",
      stage: "ielts",
      status: "available",
      description: "一词一画，在语境里积累词汇。",
      attribution,
    },
    href: "#/",
    count: 7298,
    cover: "brand/topic-education.webp",
    eyebrow: "IELTS",
    badge: "原有课程",
  },
  {
    kind: "preview",
    manifest: primaryManifest,
    cover: "atlas/img/apple.webp",
    eyebrow: "LITTLE EXPLORERS",
    badge: "小学起步",
  },
  {
    kind: "preview",
    manifest: hanziManifest,
    cover: "atlas/img/mountain.webp",
    eyebrow: "FIRST CHARACTERS",
    badge: "亲子共读",
  },
  {
    kind: "planned",
    manifest: {
      id: "middle-english",
      version: "planned",
      title: "初中英语",
      subject: "english",
      stage: "middle",
      status: "planned",
      description: "在句子里理解词义，积累常用搭配。",
      attribution,
    },
    cover: "brand/topic-education.webp",
    eyebrow: "MIDDLE SCHOOL",
    badge: "待开放",
  },
  {
    kind: "planned",
    manifest: {
      id: "high-english",
      version: "planned",
      title: "高中英语",
      subject: "english",
      stage: "high",
      status: "planned",
      description: "探索词族与阅读语境，连接更大的世界。",
      attribution,
    },
    cover: "brand/topic-education.webp",
    eyebrow: "HIGH SCHOOL",
    badge: "待开放",
  },
];

export function findCourse(id: string): CourseRegistration | undefined {
  return courseRegistry.find((course) => course.manifest.id === id);
}

export type CourseAction =
  | { kind: "legacy"; href: "#/" }
  | { kind: "preview"; courseId: string }
  | { kind: "unavailable"; reason: "planned" | "unknown" };
export function courseAction(id: string): CourseAction {
  const course = findCourse(id);
  if (!course) return { kind: "unavailable", reason: "unknown" };
  if (course.kind === "planned")
    return { kind: "unavailable", reason: "planned" };
  if (course.kind === "legacy") return { kind: "legacy", href: course.href };
  return { kind: "preview", courseId: course.manifest.id };
}
