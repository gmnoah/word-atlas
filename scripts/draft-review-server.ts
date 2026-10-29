import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { validateCourseInput } from "../src/courses/validate-input";
import { hanziManifest, primaryManifest } from "../src/courses/registry";

type Kind = "image" | "word" | "sentence";
const kinds = new Set<Kind>(["image", "word", "sentence"]);
const fileFor = { english: primaryManifest, hanzi: hanziManifest } as const;
type Subject = keyof typeof fileFor;
type Item = { id: string; kind: "english" | "hanzi"; word?: string; meaning?: string; character?: string; pinyin?: string; phrase?: string; sentence?: string; caregiverTip: string; example?: { text: string; translation: string }; media: { image: string | null; recording: string | null; exampleRecording?: string | null; source: string }; };
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));

/** Resolve only files named in the review inventory and contained by allowed roots. */
export function safeDraftReviewFile(root: string, relative: unknown): string | null {
  if (typeof relative !== "string" || !/^(public\/atlas\/(?:img|audio)\/|public\/courses\/[a-z0-9_-]+\/[a-z0-9_.-]+\/media\/atlas\/(?:img|audio)\/|data\/drafts\/(?:images|audio)\/)[a-z0-9_./-]+\.(?:webp|png|jpg|wav|mp3)$/i.test(relative) || relative.split("/").includes("..")) return null;
  try {
    const target = fs.realpathSync(path.resolve(root, relative));
    const realRoot = fs.realpathSync(root);
    const allowed = ["public/atlas/img", "public/atlas/audio", "public/courses", "data/drafts/images", "data/drafts/audio"];
    return allowed.some((directory) => {
      try { const base = fs.realpathSync(path.resolve(root, directory)); return base.startsWith(`${realRoot}${path.sep}`) && target.startsWith(`${base}${path.sep}`); }
      catch { return false; }
    }) && fs.statSync(target).isFile() ? target : null;
  } catch { return null; }
}

const cache = new Map<string, { stamp: string; data: ReturnType<typeof build> }>();
function load(root: string, subject: Subject) {
  const manifest = fileFor[subject];
  const file = path.resolve(root, "public/courses", manifest.id, manifest.version, "course.json");
  const stat = fs.statSync(file);
  const stamp = `${manifest.version}:${stat.mtimeMs}:${stat.size}`;
  const key = `${root}:${subject}`;
  const previous = cache.get(key);
  if (previous?.stamp === stamp) return previous.data;
  const data = build(root, subject);
  cache.set(key, { stamp, data });
  return data;
}
function build(root: string, subject: Subject) {
  const manifest = fileFor[subject];
  const pack = read(path.resolve(root, "public/courses", manifest.id, manifest.version, "course.json"));
  const result = validateCourseInput(pack, (relative) => fs.existsSync(path.resolve(root, "public", relative)), manifest.version);
  if (result.errors.length || pack.manifest.id !== manifest.id || pack.manifest.subject !== subject) throw new Error("课程内容校验失败，请检查本地文件。");
  const assets = new Map<string, { file: string; sha256?: string }>();
  const archiveMedia = `public/courses/${manifest.id}/${manifest.version}/media/`;
  const entries = (pack.entries as Item[]).map((entry) => {
    const selected: Record<Kind, { file: unknown; sha256?: string }> = {
      image: { file: entry.media.image ? `${archiveMedia}${entry.media.image}` : null },
      word: { file: entry.media.recording ? `${archiveMedia}${entry.media.recording}` : null },
      sentence: { file: entry.media.exampleRecording ? `${archiveMedia}${entry.media.exampleRecording}` : null },
    };
    const urls = {} as Record<Kind, string | null>;
    for (const kind of kinds) {
      const resolved = safeDraftReviewFile(root, selected[kind].file);
      if (resolved) { assets.set(`${entry.id}:${kind}`, { file: resolved, sha256: selected[kind].sha256 }); urls[kind] = `/local/draft-review/media/${subject}/${entry.id}/${kind}`; }
      else urls[kind] = null;
    }
    return { id: entry.id, kind: entry.kind, label: entry.kind === "english" ? entry.word : entry.character,
      meaning: entry.kind === "english" ? entry.meaning : entry.phrase, pinyin: entry.pinyin ?? "",
      sentence: entry.kind === "english" ? entry.example?.text : entry.sentence,
      translation: entry.example?.translation ?? "", tip: entry.caregiverTip,
      image: urls.image, wordAudio: urls.word, sentenceAudio: urls.sentence,
      imageNote: "图片与文字的匹配、适龄性待审核。",
      source: entry.media.source,
      audioNote: entry.kind === "hanzi" && !entry.media.recording ? "课程使用设备普通话朗读，暂无课程预录音频。" : "课程录音待审核。" };
  });
  return { entries, assets };
}

export function draftReviewMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = (req.url || "").split("?")[0];
  if (!url.startsWith("/local/draft-review/")) return next();
  const host = req.socket.remoteAddress ?? "";
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(host)) { res.statusCode = 403; res.end(); return; }
  if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; res.end(); return; }
  const match = /^\/local\/draft-review\/(catalog\/(english|hanzi)|media\/(english|hanzi)\/([a-z0-9_-]{1,120})\/(image|word|sentence))$/.exec(url);
  if (!match) { res.statusCode = 404; res.end(); return; }
  try {
    const subject = (match[2] ?? match[3]) as Subject;
    const data = load(process.cwd(), subject);
    res.setHeader("Cache-Control", "no-store");
    if (match[2]) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ subject, title: subject === "english" ? "基础英语" : "汉字启蒙", entries: data.entries }));
      return;
    }
    const kind = match[5] as Kind;
    const asset = data.assets.get(`${match[4]}:${kind}`);
    if (!asset || !kinds.has(kind)) { res.statusCode = 404; res.end(); return; }
    if (asset.sha256 && createHash("sha256").update(fs.readFileSync(asset.file)).digest("hex") !== asset.sha256) { res.statusCode = 409; res.end(); return; }
    const ext = path.extname(asset.file).toLowerCase();
    res.setHeader("Content-Type", ({ ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".wav": "audio/wav", ".mp3": "audio/mpeg" } as Record<string, string>)[ext] ?? "application/octet-stream");
    res.setHeader("Content-Length", fs.statSync(asset.file).size);
    if (req.method === "HEAD") res.end(); else fs.createReadStream(asset.file).pipe(res);
  } catch {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "草稿或媒体清单不可用，请检查本地文件。" }));
  }
}
