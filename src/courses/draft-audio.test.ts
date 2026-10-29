import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { test } from "node:test";

const file = "data/drafts/audio-candidates.json";
test("draft audio matches its source text and keeps provenance without approval", { skip: !fs.existsSync(file) }, () => {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const english = JSON.parse(fs.readFileSync("data/drafts/primary-300.json", "utf8"));
  const hanzi = JSON.parse(fs.readFileSync("data/drafts/hanzi-100.json", "utf8"));
  const byId = new Map([...english.entries, ...hanzi.entries].map((entry) => [entry.id, entry]));
  assert.equal(data.candidates.length, 230);
  assert.equal(new Set(data.candidates.map((entry: { file: string }) => entry.file)).size, 230);
  for (const item of data.candidates) {
    const entry = byId.get(item.id) as { kind: string; character?: string; sentence?: string; example?: { text: string } };
    assert.ok(entry);
    assert.equal(item.text, item.kind === "character" ? entry.character : entry.kind === "hanzi" ? entry.sentence : entry.example?.text);
    assert.equal(item.reviewStatus, "draft");
    assert.match(item.source, /待核实/);
    assert.match(item.file, /^data\/drafts\/audio\//);
    const bytes = fs.readFileSync(item.file);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WAVE");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
  }
});

test("every review draft has image and audio candidates without enabling release", { skip: !fs.existsSync(file) || !fs.existsSync("data/drafts/hanzi-image-candidates.json") }, () => {
  const english = JSON.parse(fs.readFileSync("data/drafts/primary-300.json", "utf8"));
  const hanzi = JSON.parse(fs.readFileSync("data/drafts/hanzi-100.json", "utf8"));
  const images = JSON.parse(fs.readFileSync("data/drafts/hanzi-image-candidates.json", "utf8"));
  const audio = JSON.parse(fs.readFileSync(file, "utf8"));
  const imageIds = new Set(images.candidates.map((item: { entryId: string }) => item.entryId));
  const audioIds = new Set(audio.candidates.map((item: { id: string; kind: string }) => `${item.id}:${item.kind}`));
  for (const entry of [...english.entries, ...hanzi.entries]) {
    assert.ok(entry.media.image || imageIds.has(entry.id), `${entry.id}: image`);
    assert.ok(entry.media.recording || audioIds.has(`${entry.id}:character`), `${entry.id}: word audio`);
    assert.ok(entry.media.exampleRecording || audioIds.has(`${entry.id}:sentence`), `${entry.id}: sentence audio`);
    assert.equal(entry.reviewStatus, "draft");
  }
});
