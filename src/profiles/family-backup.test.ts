import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyPrimaryProgress } from "../learning/primary-progress";
import { readPrimaryProgress } from "../learning/primary-progress";
import { applyRestore, exportFullBackup, preflightRestore } from "./backup";
import { archiveActivityWithBackup, restoreActivityArchiveBackup } from "../learning/activity-transaction";
import { summarizeActivity, readActivityRecord } from "../learning/activity-record";

class MemoryStorage {
  private values = new Map<string, string>();
  constructor(seed: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(seed)) this.values.set(key, JSON.stringify(value));
  }
  get length() {
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  json(key: string) {
    const raw = this.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
}

test("T28: family backup round-trips Hanzi progress for every learner", () => {
  const source = new MemoryStorage({
    "word-atlas:profiles:v1": {
      version: 1,
      activeProfileId: "child-b",
      profiles: [
        { id: "child-a", nickname: "小树", createdAt: 1 },
        { id: "child-b", nickname: "月亮", createdAt: 2 },
      ],
    },
    "word-atlas:course-settings:v1": {
      version: 1,
      coursePreferences: {
        "child-a:hanzi-starter": { englishCount: 2, hanziCount: 5, slow: true, minutes: 3 },
        "child-b:hanzi-starter": { englishCount: 3, hanziCount: 2, slow: false, minutes: 8 },
      },
    },
    "word-atlas:v3:primary-progress:child-a:hanzi-starter": {
      ...emptyPrimaryProgress("child-a", "hanzi-starter"),
      introduced: { "hanzi-u5c71": 10 },
      favorites: ["hanzi-u5c71"],
    },
  });
  const checked = preflightRestore(exportFullBackup(source));
  assert.equal(checked.ok, true);
  if (!checked.ok) return;
  assert.equal(checked.plan.profileCount, 2);
  assert.ok(checked.plan.courses.includes("hanzi-starter"));

  const target = new MemoryStorage({ "other-app:data": { keep: true } });
  const restored = applyRestore(target, checked.plan);
  assert.equal(restored.ok, true);
  const hanzi = readPrimaryProgress(target, "child-a", "hanzi-starter");
  assert.equal(hanzi.ok, true);
  if (!hanzi.ok) return;
  assert.deepEqual(hanzi.progress.favorites, ["hanzi-u5c71"]);
  assert.equal(hanzi.progress.introduced["hanzi-u5c71"], 10);
  const settings = target.json("word-atlas:course-settings:v1") as {
    coursePreferences: Record<string, { minutes: number }>;
  };
  assert.equal(settings.coursePreferences["child-a:hanzi-starter"].minutes, 3);
  assert.equal(settings.coursePreferences["child-b:hanzi-starter"].minutes, 8);
  assert.deepEqual(target.json("other-app:data"), { keep: true });
});

test("T28: an old preference without minutes still restores as the stage default", () => {
  const source = new MemoryStorage({
    "word-atlas:course-settings:v1": {
      version: 1,
      coursePreferences: {
        "child-a:hanzi-starter": { englishCount: 2, hanziCount: 2, slow: true },
      },
    },
  });
  const checked = preflightRestore(exportFullBackup(source));
  assert.equal(checked.ok, true);
  if (!checked.ok) return;
  const target = new MemoryStorage();
  assert.equal(applyRestore(target, checked.plan).ok, true);
  const settings = target.json("word-atlas:course-settings:v1") as {
    coursePreferences: Record<string, { minutes?: number }>;
  };
  // The raw record is preserved byte-for-byte; the runtime sanitizer fills 0.
  assert.equal(settings.coursePreferences["child-a:hanzi-starter"].minutes, undefined);
});

test("activity records survive full backup and remain isolated after repeated restore", () => {
  const key = "word-atlas:v3:activity:child:hanzi-starter";
  const record = {version: 1, profileId: "child", courseId: "hanzi-starter", since: 10, sessions: {
    s: {sessionId: "s", contentVersion: "0.7.0-draft", mode: "co-read", startedAt: 10, updatedAt: 20, endedAt: 20, endReason: "completed", introduced: ["hanzi1"], introSkipped: ["hanzi2"], answers: {}}
  }};
  const source = new MemoryStorage({[key]: record});
  const target = new MemoryStorage({"unrelated": {value: true}});
  const checked = preflightRestore(exportFullBackup(source));
  assert.equal(checked.ok, true);
  if (!checked.ok) return;
  assert.deepEqual(checked.plan.courses, ["hanzi-starter"]);
  assert.equal(applyRestore(target, checked.plan).ok, true);
  assert.deepEqual(target.json(key), record);
  assert.equal(applyRestore(target, checked.plan).ok, true);
  assert.deepEqual(target.json(key), record);
  assert.deepEqual(target.json("unrelated"), {value: true});
});

test("activity backup validates and preserves event date, timestamp and offset", () => {
  const key = "word-atlas:v3:activity:child:primary-starter";
  const at = Date.UTC(2026,9,27,18);
  const record = {version:1,profileId:"child",courseId:"primary-starter",since:at,sessions:{s:{
    sessionId:"s",contentVersion:"0.4.0-draft",mode:"lesson",startedAt:at,updatedAt:at,
    introduced:["apple"],introducedDays:{apple:"2026-10-28"},introducedTimes:{apple:at},introducedOffsets:{apple:-480},
    answers:{apple:"independent"},answerDays:{apple:"2026-10-28"},answerTimes:{apple:at},answerOffsets:{apple:-480}
  }}};
  const source = new MemoryStorage({[key]:record});
  const target = new MemoryStorage();
  const checked = preflightRestore(exportFullBackup(source));
  assert.equal(checked.ok,true);
  if (!checked.ok) return;
  assert.equal(applyRestore(target,checked.plan).ok,true);
  assert.deepEqual(target.json(key),record);
  const corrupt = structuredClone(record);
  corrupt.sessions.s.answerOffsets.apple = 0;
  const bad = new MemoryStorage({[key]:corrupt});
  assert.equal(preflightRestore(exportFullBackup(bad)).ok,false);
  assert.deepEqual(target.json(key),record);
});

test("archive recovery snapshot participates in backup and rejects scope mismatch", () => {
 const activity = {version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const key="word-atlas:v3:activity-archive-backup:child:course";
 const snapshot={version:1,profileId:"child",courseId:"course",raw:JSON.stringify(activity)};
 const source=new MemoryStorage({[key]:snapshot});
 const checked=preflightRestore(exportFullBackup(source));
 assert.equal(checked.ok,true);
 if(!checked.ok) return;
 assert.deepEqual(checked.plan.courses,["course"]);
 const target=new MemoryStorage();
 assert.equal(applyRestore(target,checked.plan).ok,true);
 assert.deepEqual(target.json(key),snapshot);
 const invalid=new MemoryStorage({[key]:{...snapshot,profileId:"other"}});
 assert.equal(preflightRestore(exportFullBackup(invalid)).ok,false);
});

test("a full backup preserves compacted activity and its recovery snapshot", () => {
 const time=Date.UTC(2025,0,1,12), day="2025-01-01";
 const key="word-atlas:v3:activity:child:primary-starter";
 const record={version:1,profileId:"child",courseId:"primary-starter",since:time,sessions:{s:{sessionId:"s",contentVersion:"0.4.0-draft",mode:"lesson",startedAt:time,updatedAt:time,endedAt:time,endReason:"completed",introduced:["apple"],introducedDays:{apple:day},introducedTimes:{apple:time},introducedOffsets:{apple:0},answers:{apple:"hinted"},answerDays:{apple:day},answerTimes:{apple:time},answerOffsets:{apple:0},introSkipped:[],retryEvents:{}}}};
 const source=new MemoryStorage({[key]:record});
 assert.deepEqual(archiveActivityWithBackup(source,"child","primary-starter",time+100*86400000),{ok:true,archived:1});
 const backup=exportFullBackup(source), checked=preflightRestore(backup);
 assert.equal(checked.ok,true);
 if(!checked.ok) return;
 const target=new MemoryStorage({"other-app:data":{keep:true}});
 assert.equal(applyRestore(target,checked.plan).ok,true);
 const compacted=readActivityRecord(target,"child","primary-starter",time);
 assert.ok(compacted.ok);
 if (!compacted.ok) return;
 assert.equal(summarizeActivity(compacted.record).hinted,1);
 assert.equal(restoreActivityArchiveBackup(target,"child","primary-starter",target.getItem(key)).ok,true);
 assert.deepEqual(target.json(key),record);
 assert.deepEqual(target.json("other-app:data"),{keep:true});
 const damaged=JSON.parse(backup);
 damaged.records[key].archivedSessions.s.totals.hinted=2;
 assert.equal(preflightRestore(JSON.stringify(damaged)).ok,false);
});
