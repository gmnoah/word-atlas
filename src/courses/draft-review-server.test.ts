import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { draftReviewMiddleware, safeDraftReviewFile } from "../../scripts/draft-review-server";
import type { IncomingMessage, ServerResponse } from "node:http";

test("local review media only serves approved subdirectories and never follows an escaping symlink", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "word-atlas-preview-"));
  try {
    for (const dir of ["public/atlas/img", "public/atlas/audio", "data/drafts/images", "data/drafts/audio"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
    const good = path.join(root, "public/atlas/img/cat.webp");
    fs.writeFileSync(good, "synthetic image");
    const secret = path.join(root, "secret.png");
    fs.writeFileSync(secret, "private");
    fs.symlinkSync(secret, path.join(root, "data/drafts/images/escape.png"));
    assert.equal(safeDraftReviewFile(root, "public/atlas/img/cat.webp"), fs.realpathSync(good));
    assert.equal(safeDraftReviewFile(root, "data/drafts/images/escape.png"), null);
    assert.equal(safeDraftReviewFile(root, "public/atlas/img/../../secret.png"), null);
    assert.equal(safeDraftReviewFile(root, "secret.png"), null);
    assert.equal(safeDraftReviewFile(root, "/etc/passwd"), null);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("draft review refuses remote clients and non-GET methods", () => {
  const simulate = (address: string, method: string) => {
    const req = { url: "/local/draft-review/catalog/hanzi", method, socket: { remoteAddress: address } } as unknown as IncomingMessage;
    const res = { statusCode: 200, end() {} } as unknown as ServerResponse;
    draftReviewMiddleware(req, res, () => { throw new Error("unexpected fallthrough"); });
    return res.statusCode;
  };
  assert.equal(simulate("192.168.1.23", "GET"), 403);
  assert.equal(simulate("127.0.0.1", "POST"), 405);
});

test("review catalogs match the active archived course, including new Hanzi", () => {
  for (const [subject, course, version] of [["hanzi", "hanzi-starter", "0.7.0-draft"], ["english", "primary-starter", "0.4.0-draft"]]) {
    const req = { url: `/local/draft-review/catalog/${subject}`, method: "GET", socket: { remoteAddress: "127.0.0.1" } } as unknown as IncomingMessage;
    let output = "";
    const res = { statusCode: 200, setHeader() {}, end(value: string) { output = value; } } as unknown as ServerResponse;
    draftReviewMiddleware(req, res, () => { throw new Error("unexpected fallthrough"); });
    assert.equal(res.statusCode, 200);
    const catalog = JSON.parse(output);
    const archive = JSON.parse(fs.readFileSync(`public/courses/${course}/${version}/course.json`, "utf8"));
    assert.equal(catalog.entries.length, archive.entries.length);
    assert.deepEqual(catalog.entries.map((entry: { id: string }) => entry.id), archive.entries.map((entry: { id: string }) => entry.id));
    assert.ok(catalog.entries.every((entry: { image: string | null }) => entry.image));
    if (subject === "hanzi") {
      const latest = catalog.entries.find((entry: { label: string }) => entry.label === "红");
      assert.equal(latest.meaning, "红色");
      assert.equal(latest.wordAudio, null);
      assert.match(latest.audioNote, /设备普通话/);
    }
  }
});
