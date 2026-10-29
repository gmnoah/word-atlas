/** Prepare review-only draft packs. Existing outputs are never overwritten. */
import fs from "node:fs";
import path from "node:path";
import { primarySample } from "../src/courses/primary-sample.ts";
import { hanziSample } from "../src/courses/hanzi-sample.ts";
import { validateCourseInput } from "../src/courses/validate-input.ts";
import type { EnglishEntry, HanziEntry, SampleCourse } from "../src/courses/types.ts";

const root = process.cwd();
const publicDir = path.join(root, "public");
const outputDir = path.join(root, "data", "drafts");
const json = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const exists = (relative: string) => fs.existsSync(path.join(publicDir, relative));
const english = structuredClone(primarySample);
const hanzi = structuredClone(hanziSample);
english.manifest = { ...english.manifest, id: "primary-expansion-draft", version: "0.1.0-draft" };
hanzi.manifest = { ...hanzi.manifest, id: "hanzi-expansion-draft", version: "0.1.0-draft" };
const existing = new Set(english.entries.map((entry) => entry.kind === "english" ? entry.word.toLowerCase() : ""));
const index = json(path.join(publicDir, "atlas/index.json"));
const chunks = new Map<number, any[]>();
const additions: EnglishEntry[] = [];
for (const [position, row] of (index.words as unknown[][]).entries()) {
  const [sourceId, word, , , level] = row;
  if (typeof sourceId !== "string" || typeof word !== "string" || level !== 0 || !/^[a-z]+$/i.test(word) || existing.has(word.toLowerCase())) continue;
  const n = Math.floor(position / index.chunk);
  if (!chunks.has(n)) chunks.set(n, json(path.join(publicDir, `atlas/entries/${n}.json`)));
  const source = chunks.get(n)!.find((entry) => entry.id === sourceId);
  const example = source?.ex?.[0];
  if (!example || typeof example.en !== "string" || typeof example.zh !== "string" || !example.zh.trim() ||
      example.en.trim().split(/\s+/).length > 12 || !new RegExp(`(?<![A-Za-z])${word}(?![A-Za-z])`, "i").test(example.en) ||
      typeof source.senses?.[0]?.zh !== "string" || !source.senses[0].zh.trim()) continue;
  const group = Math.floor(additions.length / 10) + 1;
  additions.push({ kind: "english", id: `en-${sourceId}`, topicId: `draft-en-${String(group).padStart(2, "0")}`,
    word, meaning: source.senses[0].zh, example: { text: example.en, translation: example.zh, targetForm: word },
    caregiverTip: "和孩子一起看看图片，试着在生活中找一找。", reviewStatus: "draft",
    media: { image: exists(`atlas/img/${sourceId}.webp`) ? `atlas/img/${sourceId}.webp` : null,
      recording: exists(`atlas/audio/uk/${sourceId}.mp3`) ? `atlas/audio/uk/${sourceId}.mp3` : null,
      exampleRecording: exists(`atlas/audio/ex/${sourceId}.mp3`) ? `atlas/audio/ex/${sourceId}.mp3` : null,
      locale: "en-GB", source: "Word Atlas contributors（词光）· CC BY 4.0；复用原词义、日常例句、插画与录音，儿童适龄性待审校" } });
  existing.add(word.toLowerCase());
  if (additions.length === 270) break;
}
if (additions.length !== 270) throw new Error(`英语候选不足：${additions.length}/270`);
for (let i = 0; i < additions.length; i += 10) {
  const group = additions.slice(i, i + 10);
  english.lessons.push({ id: group[0].topicId, title: `待分类英语 ${String(i / 10 + 1).padStart(2, "0")}`, subtitle: "候选内容，主题和适龄性待审核", entryIds: group.map((entry) => entry.id) });
}
english.entries.push(...additions);
const rows = fs.readFileSync(path.join(outputDir, "hanzi-expansion.tsv"), "utf8").trim().split(/\r?\n/).map((line) => line.split("\t"));
if (rows.length !== 80 || rows.some((row) => row.length !== 4)) throw new Error("汉字草稿应包含 80 行，每行四列");
const chars = new Set(hanzi.entries.map((entry) => entry.kind === "hanzi" ? entry.character : ""));
const extra: HanziEntry[] = rows.map(([character, pinyin, phrase, sentence], index) => {
  if ([...character].length !== 1 || chars.has(character) || !phrase.includes(character) || !sentence.includes(character)) throw new Error(`汉字重复或短句缺字：${character}`);
  chars.add(character);
  return { kind: "hanzi", id: `hanzi-u${character.codePointAt(0)!.toString(16)}`, topicId: `draft-hanzi-${String(Math.floor(index / 10) + 1).padStart(2, "0")}`,
    character, pinyin, phrase, sentence, question: "一起在这句话里找找这个字。", caregiverTip: `和孩子在生活里找找“${phrase}”。`, reviewStatus: "draft",
    media: { image: null, recording: null, exampleRecording: null, locale: "zh-CN", source: "新编候选文本；插画及录音尚未制作" } };
});
for (let i = 0; i < extra.length; i += 10) {
  const group = extra.slice(i, i + 10);
  hanzi.lessons.push({ id: group[0].topicId, title: `待分类汉字 ${String(i / 10 + 1).padStart(2, "0")}`, subtitle: "候选内容，主题和适龄性待审核", entryIds: group.map((entry) => entry.id) });
}
hanzi.entries.push(...extra);

const packs: SampleCourse[] = [english, hanzi];
for (const pack of packs) {
  const report = validateCourseInput(pack, exists, pack.manifest.version);
  if (report.errors.length) throw new Error(`${pack.manifest.id} 结构错误：${JSON.stringify(report.errors.slice(0, 5))}`);
}
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
const csv = [["课程", "条目ID", "内容", "状态", "文本审校", "图片审校", "词音审校", "例句音频审校", "备注"]];
for (const pack of packs) for (const entry of pack.entries) csv.push([pack.manifest.id, entry.id,
  entry.kind === "english" ? entry.word : entry.character, "draft", "待审校", entry.media.image ? "待审校" : "待制作",
  entry.media.recording ? "待审校" : "待制作", entry.media.exampleRecording ? "待审校" : "待制作",
  entry.kind === "english" && additions.some((item) => item.id === entry.id) ? "复用原词库日常例句，需核查儿童适龄性和主题" : "适龄性及素材一致性待审核"]);
const outputs = [
  ["primary-300.json", JSON.stringify(english, null, 2) + "\n"],
  ["hanzi-100.json", JSON.stringify(hanzi, null, 2) + "\n"],
  ["review-queue.csv", "\ufeff" + csv.map((row) => row.map(quote).join(",")).join("\n") + "\n"],
] as const;
// Do not overwrite any existing editorial changes; partial runs can safely resume.
for (const [name, content] of outputs) {
  const file = path.join(outputDir, name);
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") !== content) throw new Error(`${name} 已有不同内容，未覆盖`);
}
for (const [name, content] of outputs) {
  const file = path.join(outputDir, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, content, { flag: "wx" });
}
console.log(JSON.stringify(packs.map((pack) => ({ courseId: pack.manifest.id, entries: pack.entries.length,
  releaseBlockers: validateCourseInput(pack, exists).releaseBlockers.length })), null, 2));
