#!/usr/bin/env python3
"""Prepare local TTS review samples. Never publish or overwrite edited material."""
from __future__ import annotations
import concurrent.futures
import hashlib
import json
import math
import os
from pathlib import Path
import struct
import subprocess
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[1]
DRAFTS = ROOT / "data" / "drafts"
OUT = DRAFTS / "audio"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def content(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def prepare(item: dict) -> dict:
    directory = OUT / item["course"]
    output = directory / f'{item["id"]}-{item["kind"]}.wav'
    metadata = output.with_suffix(".json")
    if output.exists() or metadata.exists():
        if not output.exists() or not metadata.exists():
            raise RuntimeError(f'{item["id"]}: 文件或元数据不完整，未覆盖')
        old = content(metadata)
        if any(old.get(k) != item[k] for k in ("course", "id", "kind", "text", "voice", "locale")) or old.get("sha256") != digest(output):
            raise RuntimeError(f'{item["id"]}: 内容或音频已变化，未覆盖')
        return old
    directory.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="word-atlas-voice-") as temporary:
        aiff = Path(temporary) / "sample.aiff"
        wav = Path(temporary) / "sample.wav"
        subprocess.run(["say", "-v", item["voice"], "-r", "150", "-o", str(aiff), item["text"]], check=True, timeout=45, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16", str(aiff), str(wav)], check=True, timeout=20, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        with wave.open(str(wav), "rb") as audio:
            frames = audio.readframes(audio.getnframes())
            if audio.getsampwidth() != 2 or not frames or len(frames) % 2:
                raise RuntimeError(f'{item["id"]}: 音频为空或格式异常')
            samples = struct.unpack("<" + "h" * (len(frames) // 2), frames)
            rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples))
            if rms < 10:
                raise RuntimeError(f'{item["id"]}: 音频近似静音')
            duration = audio.getnframes() / audio.getframerate()
        # Exclusive creation prevents overwriting a user-edited file.
        with output.open("xb") as target:
            target.write(wav.read_bytes())
    record = {**item, "file": str(output.relative_to(ROOT)), "sha256": digest(output), "seconds": round(duration, 3),
              "source": "本机 macOS 系统语音生成；使用及再分发条件待核实", "reviewStatus": "draft"}
    with metadata.open("x", encoding="utf-8") as target:
        json.dump(record, target, ensure_ascii=False, indent=2)
        target.write("\n")
    return record


def main():
    hanzi = content(DRAFTS / "hanzi-100.json")
    english = content(DRAFTS / "primary-300.json")
    items = []
    for entry in hanzi["entries"]:
        for kind, text in (("character", entry["character"]), ("sentence", entry["sentence"])):
            items.append({"course": "hanzi-expansion-draft", "id": entry["id"], "kind": kind, "text": text, "voice": "Tingting", "locale": "zh-CN"})
    for entry in english["entries"]:
        if not entry["media"].get("exampleRecording"):
            items.append({"course": "primary-expansion-draft", "id": entry["id"], "kind": "sentence", "text": entry["example"]["text"], "voice": "Daniel", "locale": "en-GB"})
    records = []
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(prepare, item) for item in items]
        for future in concurrent.futures.as_completed(futures):
            try:
                records.append(future.result())
            except Exception as error:
                errors.append(str(error))
            if (len(records) + len(errors)) % 25 == 0:
                print(f"已处理 {len(records) + len(errors)}/{len(items)}，失败 {len(errors)}", flush=True)
    records.sort(key=lambda item: (item["course"], item["id"], item["kind"]))
    if errors:
        print(json.dumps({"requested": len(items), "prepared": len(records), "failed": len(errors)}, ensure_ascii=False), flush=True)
        for error in errors[:10]:
            print(error, flush=True)
        raise SystemExit(1)
    manifest = DRAFTS / "audio-candidates.json"
    value = json.dumps({"version": 1, "purpose": "仅供听审，不用于发布", "candidates": records}, ensure_ascii=False, indent=2) + "\n"
    if manifest.exists() and manifest.read_text(encoding="utf-8") != value:
        raise RuntimeError("音频候选清单已有不同内容，未覆盖")
    if not manifest.exists():
        manifest.write_text(value, encoding="utf-8")
    print(json.dumps({"requested": len(items), "prepared": len(records), "failed": len(errors)}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
