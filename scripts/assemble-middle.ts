import fs from "node:fs";
import path from "node:path";
import { middleFull } from "../src/courses/middle-full.ts";
import { buildMiddleEntry, atlasMap, findTargetInExample } from "./generate-middle-curriculum.ts";
import { stage2Units } from "./plan-all-units.ts";
import type { Lesson, EnglishEntry } from "../src/courses/types.ts";

export function assembleCourse(stage: 2 | 3 | 4) {
  // 1. Keep base 10 units and 100 entries
  const lessons: Lesson[] = [...middleFull.lessons.slice(0, 10)];
  const entries: EnglishEntry[] = [...(middleFull.entries.slice(0, 100) as EnglishEntry[])];

  // 2. Add Stage 2 units (Units 11–30)
  if (stage >= 2) {
    for (const u of stage2Units) {
      lessons.push({
        id: u.id,
        title: u.title,
        subtitle: u.subtitle,
        entryIds: u.words.map((w) => `mid-${w}`),
      });
      for (const w of u.words) {
        entries.push(buildMiddleEntry(u.id, w));
      }
    }
  }

  return { lessons, entries };
}

// If run directly, generate Stage 2
const stage = 2;
const { lessons, entries } = assembleCourse(stage);

const fileContent = `import type { SampleCourse } from "./types";
import { middleManifest } from "./registry";

/** 初中英语样板课程（${entries.length} 词 ${lessons.length} 单元），面向初中生常用生活、学习、科学与情境搭配。 */
export const middleFull: SampleCourse = {
  manifest: middleManifest,
  lessons: ${JSON.stringify(lessons, null, 2)},
  entries: ${JSON.stringify(entries, null, 2)}
};
`;

const targetPath = path.resolve(process.cwd(), "src/courses/middle-full.ts");
fs.writeFileSync(targetPath, fileContent, "utf8");
console.log(`Successfully generated middle-full.ts with ${lessons.length} lessons and ${entries.length} entries.`);
