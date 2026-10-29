import fs from "node:fs";
const course = JSON.parse(fs.readFileSync("data/drafts/hanzi-100.json", "utf8"));
const candidates = JSON.parse(fs.readFileSync("data/drafts/hanzi-image-candidates.json", "utf8"));
const byId = new Map(candidates.candidates.map((candidate: { entryId: string }) => [candidate.entryId, candidate]));
const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const rows: unknown[][] = [["条目ID", "汉字", "短语", "例句", "候选图片", "来源", "审核提醒", "图片审核", "审核人", "日期"]];
for (const entry of course.entries) {
  const image = byId.get(entry.id) as { file: string; source: string; reviewNote: string } | undefined;
  rows.push([entry.id, entry.character, entry.phrase, entry.sentence, image?.file ?? (entry.media.image ? `public/${entry.media.image}` : ""),
    image?.source ?? entry.media.source, image?.reviewNote ?? "原样板插画，待审核图文一致性及适龄性。", "待审核", "", ""]);
}
const file = "data/drafts/hanzi-image-review.csv";
const value = "\ufeff" + rows.map((row) => row.map(quote).join(",")).join("\n") + "\n";
if (fs.existsSync(file) && fs.readFileSync(file, "utf8") !== value) throw new Error("图片审核表已有不同内容，未覆盖");
if (!fs.existsSync(file)) fs.writeFileSync(file, value, { flag: "wx" });
console.log(`已准备 ${rows.length - 1} 条图片审核记录`);
