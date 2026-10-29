/** A single review table for draft text, candidate images and candidate audio. */
import fs from "node:fs";
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const english = read("data/drafts/primary-300.json");
const hanzi = read("data/drafts/hanzi-100.json");
const images = read("data/drafts/hanzi-image-candidates.json");
const audio = read("data/drafts/audio-candidates.json");
const imageById = new Map(images.candidates.map((item: { entryId: string }) => [item.entryId, item]));
const audioById = new Map(audio.candidates.map((item: { id: string; kind: string }) => [`${item.id}:${item.kind}`, item]));
const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const rows: unknown[][] = [["课程", "条目ID", "内容", "例句", "图片候选", "图片来源", "词音候选", "例句音频候选", "审核提醒", "状态", "审核人", "日期"]];
for (const course of [english, hanzi]) for (const entry of course.entries) {
  const image = imageById.get(entry.id) as { file: string; source: string; reviewNote: string } | undefined;
  const wordAudio = audioById.get(`${entry.id}:character`) as { file: string } | undefined;
  const sentenceAudio = audioById.get(`${entry.id}:sentence`) as { file: string } | undefined;
  const asset = (file: string | null | undefined) => file ? `public/${file}` : "";
  rows.push([course.manifest.id, entry.id, entry.kind === "english" ? entry.word : entry.character,
    entry.kind === "english" ? entry.example.text : entry.sentence,
    image?.file ?? asset(entry.media.image), image?.source ?? entry.media.source,
    wordAudio?.file ?? asset(entry.media.recording), sentenceAudio?.file ?? asset(entry.media.exampleRecording),
    [image?.reviewNote ?? "文本、图像和音频一致性及适龄性待审核。", wordAudio || sentenceAudio ? "本机系统语音的使用及再分发条件待核实。" : ""].filter(Boolean).join(" "), "待审核", "", ""]);
}
const result = "\ufeff" + rows.map((row) => row.map(quote).join(",")).join("\n") + "\n";
const path = "data/drafts/media-review.csv";
if (fs.existsSync(path) && fs.readFileSync(path, "utf8") !== result) throw new Error("媒体审核表已有不同内容，未覆盖");
if (!fs.existsSync(path)) fs.writeFileSync(path, result, { flag: "wx" });
console.log(`已准备 ${rows.length - 1} 条集中审核记录`);
