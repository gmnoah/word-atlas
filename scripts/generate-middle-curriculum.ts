import fs from "node:fs";
import path from "node:path";
import { exampleTargetParts } from "../src/courses/example-target.ts";
import type { EnglishEntry, Lesson, SampleCourse } from "../src/courses/types.ts";

export interface UnitDefinition {
  id: string;
  title: string;
  subtitle: string;
  words: string[];
}

// Load atlas entries into memory
const publicDir = path.resolve(process.cwd(), "public");
const files = fs.readdirSync(path.join(publicDir, "atlas/entries")).filter((f) => f.endsWith(".json"));
export const atlasMap = new Map<string, any>();
export const posPool = new Map<string, string[]>();

for (const f of files) {
  const items = JSON.parse(fs.readFileSync(path.join(publicDir, `atlas/entries/${f}`), "utf8"));
  for (const item of items) {
    const w = item.w.toLowerCase();
    atlasMap.set(w, item);
    const pos = item.senses?.[0]?.pos;
    if (pos && item.senses?.[0]?.zh) {
      if (!posPool.has(pos)) posPool.set(pos, []);
      posPool.get(pos)!.push(item.senses[0].zh.split(/[；;]/)[0].trim());
    }
  }
}

// Find single-occurrence whole-word target in example sentence
export function findTargetInExample(word: string, exList: { en: string; zh: string }[]): { text: string; translation: string; targetForm: string } | null {
  const w = word.toLowerCase();
  for (const ex of exList) {
    if (!ex.en || !ex.zh) continue;
    const tokens = ex.en.match(/[a-zA-Z]+/g) || [];
    // 1. Exact match
    for (const t of tokens) {
      if (t.toLowerCase() === w && exampleTargetParts(ex.en, t)) {
        return { text: ex.en, translation: ex.zh, targetForm: t };
      }
    }
    // 2. Regular inflections
    const inflections = [
      w + "s", w + "es", w + "d", w + "ed", w + "ing",
      w.endsWith("e") ? w.slice(0, -1) + "ing" : "",
      w.endsWith("e") ? w + "d" : "",
      w.endsWith("y") ? w.slice(0, -1) + "ies" : "",
      w.endsWith("y") ? w.slice(0, -1) + "ied" : "",
      w + w.slice(-1) + "ed",
      w + w.slice(-1) + "ing",
    ].filter(Boolean);
    for (const t of tokens) {
      if (inflections.includes(t.toLowerCase()) && exampleTargetParts(ex.en, t)) {
        return { text: ex.en, translation: ex.zh, targetForm: t };
      }
    }
  }
  return null;
}

// Build EnglishEntry adhering to the four-dimension contract
export function buildMiddleEntry(unitId: string, word: string): EnglishEntry {
  const w = word.toLowerCase();
  const item = atlasMap.get(w);
  if (!item) throw new Error(`Word not found in atlas: ${word}`);

  const target = findTargetInExample(word, item.ex);
  if (!target) throw new Error(`Target form not found in examples for: ${word}`);

  const pos = item.senses?.[0]?.pos || "n.";
  const fullMeaning = item.senses.map((s: any) => s.zh).join("；");
  const lessonMeaning = item.senses[0].zh.split(/[；;]/)[0].trim();

  // Collocation
  let phrase = "";
  let translation = "";
  if (item.col && item.col.length > 0) {
    for (const c of item.col) {
      const parts = c.split("｜");
      if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
        phrase = parts[0].trim();
        translation = parts[1].trim();
        break;
      }
    }
  }
  if (!phrase) {
    phrase = `${word} practice`;
    translation = `${lessonMeaning}练习`;
  }

  // Distractors for contextQuestion: must be same POS, distinct from each other and from lessonMeaning/meaning
  const targetMeaningLower = lessonMeaning.toLowerCase();
  const fullMeaningLower = fullMeaning.toLowerCase();
  const distractors: string[] = [];

  // 1. Try other senses of the same word if same POS
  for (let s = 1; s < item.senses.length; s++) {
    const sense = item.senses[s];
    if (sense.pos === pos) {
      const m = sense.zh.split(/[；;]/)[0].trim();
      if (m && m.toLowerCase() !== targetMeaningLower && !distractors.includes(m)) {
        distractors.push(m);
        if (distractors.length === 2) break;
      }
    }
  }

  // 2. If not enough, pick from posPool
  const candidates = posPool.get(pos) || [];
  let salt = word.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  for (let i = 0; i < candidates.length && distractors.length < 2; i++) {
    const idx = (salt * 31 + i * 17) % candidates.length;
    const cand = candidates[idx];
    if (
      cand &&
      cand.toLowerCase() !== targetMeaningLower &&
      !fullMeaningLower.includes(cand.toLowerCase()) &&
      !distractors.includes(cand) &&
      cand.length >= 2 &&
      cand.length <= 12
    ) {
      distractors.push(cand);
    }
  }

  if (distractors.length < 2) {
    throw new Error(`Could not generate 2 distractors for ${word}`);
  }

  const tip = item.tip?.trim() || `在句中理解“${lessonMeaning}”，注意与常用搭配“${phrase}”结合运用。`;

  return {
    kind: "english",
    id: `mid-${word}`,
    topicId: unitId,
    word: item.w,
    meaning: fullMeaning,
    partOfSpeech: pos,
    lessonMeaning,
    collocation: {
      phrase,
      translation,
    },
    contextQuestion: {
      distractors: [distractors[0], distractors[1]],
      explanation: `在此句中，结合上下文语境表示“${lessonMeaning}”。`,
    },
    example: {
      text: target.text,
      translation: target.translation,
      targetForm: target.targetForm,
    },
    caregiverTip: tip,
    reviewStatus: "draft",
    media: {
      image: `atlas/img/${item.id}.webp`,
      recording: `atlas/audio/uk/${item.id}.mp3`,
      exampleRecording: `atlas/audio/ex/${item.id}.mp3`,
      locale: "en-GB",
      source: "Word Atlas contributors（词光）· CC BY 4.0；复用词光初中高频词汇例句、插画与英式录音，内容适龄性待审校",
    },
  };
}
