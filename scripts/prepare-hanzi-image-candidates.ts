/** Assemble a review-only image inventory; never alter the course or approvals. */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const reused: Record<string, string> = {
  "家": "family", "猫": "cat", "狗": "dog", "牛": "cow", "羊": "sheep", "鸡": "chicken", "鸭": "duck", "兔": "rabbit", "虫": "insect",
  "桌": "table", "椅": "chair", "门": "door", "窗": "window", "灯": "lamp", "书": "book", "笔": "pencil", "纸": "paper", "本": "notebook",
  "爷": "grandfather", "奶": "grandmother", "孩": "child", "天": "sky", "风": "wind", "雪": "snow", "光": "light", "星": "star", "海": "sea", "河": "river", "湖": "lake", "林": "forest",
  "春": "spring", "夏": "summer", "秋": "autumn", "冬": "winter", "大": "big", "小": "small", "多": "many", "少": "few", "上": "above", "里": "inside", "外": "outside", "早": "morning", "晚": "evening",
  "吃": "eat", "喝": "drink", "饭": "meal", "果": "fruit", "菜": "vegetable", "米": "rice", "茶": "tea", "蛋": "egg", "甜": "sweet",
  "时": "time",
  "画": "draw", "走": "walk", "跑": "run", "跳": "jump", "坐": "sit", "看": "look", "听": "listen", "说": "speak", "笑": "smile", "洗": "wash", "睡": "sleep",
};
const generated: Record<string, string> = {
  "爸": "hanzi-u7238-father.png", "妈": "hanzi-u5988-mother.png", "哥": "hanzi-u54e5-brother.png",
  "姐": "hanzi-u59d0-sister.png", "弟": "hanzi-u5f1f-younger-brother.png", "妹": "hanzi-u59b9-younger-sister.png",
  "下": "hanzi-u4e0b-below.png", "左": "hanzi-u5de6-left.png", "右": "hanzi-u53f3-right.png", "地": "hanzi-u5730-ground.png", "草": "hanzi-u8349-grass.png",
  "今": "hanzi-u4eca-today.png", "明": "hanzi-u660e-tomorrow.png", "年": "hanzi-u5e74-year.png", "面": "hanzi-u9762-noodles.png", "叶": "hanzi-u53f6-leaf.png",
};
const pack = JSON.parse(fs.readFileSync("data/drafts/hanzi-100.json", "utf8"));
const byChar = new Map<string, { id: string }>(pack.entries.map((entry: { character: string; id: string }) => [entry.character, entry]));
const candidates = [];
for (const [character, name] of Object.entries(reused)) {
  const entry = byChar.get(character);
  const file = `public/atlas/img/${name}.webp`;
  if (!entry || !fs.existsSync(file)) throw new Error(`Missing candidate: ${character}`);
  candidates.push({ entryId: entry.id, character, file, kind: "existing-atlas", sha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
    source: "Word Atlas contributors · CC BY 4.0；沿用原项目插画", reviewStatus: "draft",
    reviewNote: "候选图表达目标字或短语；例句一致性、适龄性与题目选项歧义待人工审核。" });
}
for (const [character, name] of Object.entries(generated)) {
  const entry = byChar.get(character);
  const file = `data/drafts/images/${name}`;
  if (!entry || !fs.existsSync(file)) continue;
  candidates.push({ entryId: entry.id, character, file, kind: "new-imagegen", sha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
    source: "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认", reviewStatus: "draft",
    reviewNote: ["今", "明"].includes(character)
      ? "画面只能辅助例句，不能单独表达今天或明天；不得作为独立看图选字题。"
      : "画面与目标字、例句及选项之间可能存在歧义，需人工审查；审核前不得用于图片选择题。" });
}
const file = path.join("data", "drafts", "hanzi-image-candidates.json");
let result: { version: number; purpose: string; candidates: typeof candidates } = { version: 1, purpose: "仅供人工审核，不用于发布", candidates: [] };
if (fs.existsSync(file)) {
  const existing = JSON.parse(fs.readFileSync(file, "utf8"));
  if (existing.version !== 1 || !Array.isArray(existing.candidates) || existing.candidates.some((item: { character?: unknown }) => typeof item.character !== "string") ||
      new Set(existing.candidates.map((item: { character: string }) => item.character)).size !== existing.candidates.length) throw new Error("候选清单损坏，未覆盖");
  result = existing;
}
const seen = new Set(result.candidates.map((item) => item.character));
const newItems = candidates.filter((item) => !seen.has(item.character));
result.candidates = [...result.candidates, ...newItems];
if (newItems.length) fs.writeFileSync(file, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ count: result.candidates.length, added: newItems.length, reused: result.candidates.filter((item) => item.kind === "existing-atlas").length, generated: result.candidates.filter((item) => item.kind === "new-imagegen").length }));
