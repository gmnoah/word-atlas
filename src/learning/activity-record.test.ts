import { test } from "node:test";
import assert from "node:assert/strict";
import { activityKey, parseActivityRecord, putActivitySnapshot, readActivityRecord, writeActivityRecord, type ActivityRecord, type ActivitySnapshot } from "./activity-record";
test("activity snapshots are scoped, idempotent and reject older writes", () => {
 const record: ActivityRecord = { version: 1, profileId: "child", courseId: "hanzi-starter", since: 100, sessions: {} };
 const snapshot: ActivitySnapshot = { sessionId: "session1", contentVersion: "0.7", mode: "lesson", startedAt: 100, updatedAt: 120, introduced: ["hanzi1"], answers: {hanzi1: "hinted"} };
 const saved = putActivitySnapshot(record, snapshot);
 assert.deepEqual(putActivitySnapshot(saved, snapshot), saved);
 assert.strictEqual(putActivitySnapshot(saved, {...snapshot, updatedAt: 110}), saved);
 assert.equal(parseActivityRecord(saved, "other", "hanzi-starter"), null);
 assert.notEqual(activityKey("child", "hanzi-starter"), activityKey("child", "primary-starter"));
 assert.throws(() => putActivitySnapshot(record, {...snapshot, mode: "co-read"}));
 assert.throws(() => activityKey("../bad", "course"));
});


test("invalid stored activity is preserved and valid activity round-trips", () => {
 const values = new Map<string, string>();
 const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
 const empty = readActivityRecord(storage, "child", "course", 100);
 assert.equal(empty.ok, true);
 if (!empty.ok) return;
 assert.equal(writeActivityRecord(storage, empty.record), true);
 assert.deepEqual(readActivityRecord(storage, "child", "course", 200), empty);
 const key = activityKey("child", "course"); values.set(key, "broken");
 assert.equal(readActivityRecord(storage, "child", "course", 200).ok, false);
 assert.equal(writeActivityRecord(storage, empty.record), false);
 assert.equal(values.get(key), "broken");
});

test("backup preflight validates activity key and scope", async () => {
 const { preflightRestore } = await import("../profiles/backup");
 const key = activityKey("child", "course");
 const record: ActivityRecord = {version: 1, profileId: "child", courseId: "course", since: 100, sessions: {}};
 const backup = (value: unknown) => JSON.stringify({app: "word-atlas", version: 3, scope: "all-local-data", records: {[key]: value}});
 const valid = preflightRestore(backup(record));
 assert.equal(valid.ok, true);
 if (valid.ok) assert.deepEqual(valid.plan.courses, ["course"]);
 assert.equal(preflightRestore(backup({...record, profileId: "other"})).ok, false);
});

test("session snapshot distinguishes support and omits co-reading and spelling", async () => {
 const { snapshotFromSession } = await import("./activity-record");
 const session = { id: "s", contentVersion: "1", startedAt: 10, introduced: ["a", "a"], practice: [], attempts: {
  a: {contentId: "a", first: true, kind: "hanzi-listen", result: {outcome: "answered", correct: true, support: "assisted"}},
  b: {contentId: "b", first: true, kind: "spell", result: {outcome: "answered", correct: true, support: "independent"}},
  c: {contentId: "c", first: true, kind: "hanzi-listen", result: {outcome: "resource-error"}},
  d: {contentId: "d", first: false, kind: "hanzi-listen", result: {outcome: "answered", correct: true, support: "independent"}},
 } } as unknown as import("./session").LearningSession;
 assert.deepEqual(snapshotFromSession(session, "lesson", 20).answers, {a: "assisted", c: "resource-error"});
 assert.deepEqual(snapshotFromSession(session, "co-read", 20).answers, {});
 assert.deepEqual(snapshotFromSession(session, "lesson", 20).introduced, ["a"]);
});

test("session activity saving is idempotent and does not overwrite invalid records", async () => {
 const { saveSessionActivity } = await import("./activity-record");
 const values = new Map<string, string>();
 const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
 const session = {id: "session1", courseId: "course", contentVersion: "1", startedAt: 10, introduced: ["a"], attempts: {}} as unknown as import("./session").LearningSession;
 assert.equal(saveSessionActivity(storage, "child", session, "co-read", 20), true);
 assert.equal(saveSessionActivity(storage, "child", session, "co-read", 20), true);
 const result = readActivityRecord(storage, "child", "course", 30);
 assert.equal(result.ok && Object.keys(result.record.sessions).length, 1);
 values.set(activityKey("child", "course"), "broken");
 assert.equal(saveSessionActivity(storage, "child", session, "co-read", 30), false);
 assert.equal(values.get(activityKey("child", "course")), "broken");
});


test("replayed partial snapshots cannot erase first outcomes or change session identity", () => {
 const record: ActivityRecord = { version: 1, profileId: "child", courseId: "course", since: 1, sessions: {} };
 const original: ActivitySnapshot = { sessionId: "s", contentVersion: "1", mode: "lesson", startedAt: 1, updatedAt: 2, introduced: ["a"], answers: { a: "hinted" } };
 const saved = putActivitySnapshot(record, original);
 const replayed = putActivitySnapshot(saved, { ...original, introduced: [], answers: { a: "independent" } });
 assert.deepEqual(replayed.sessions.s.introduced, ["a"]);
 assert.equal(replayed.sessions.s.answers.a, "hinted");
 assert.throws(() => putActivitySnapshot(saved, { ...original, mode: "co-read", answers: {} }));
});


test("activity summary counts first results and only co-reading with viewed content", async () => {
 const { summarizeActivity } = await import("./activity-record");
 const record: ActivityRecord = {version: 1, profileId: "child", courseId: "course", since: 1, sessions: {
  one: {sessionId: "one", contentVersion: "1", mode: "lesson", startedAt: 1, updatedAt: 2, introduced: [], answers: {a: "independent", b: "hinted", c: "assisted", d: "incorrect", e: "resource-error", f: "skipped"}},
  two: {sessionId: "two", contentVersion: "1", mode: "co-read", startedAt: 1, updatedAt: 2, introduced: ["a"], answers: {}},
  three: {sessionId: "three", contentVersion: "1", mode: "co-read", startedAt: 1, updatedAt: 2, introduced: [], answers: {}},
 }};
 assert.deepEqual(summarizeActivity(record), {independent: 1, hinted: 1, assisted: 1, incorrect: 1, skipped: 1, resourceErrors: 1, coReadSessions: 1, introSkipped: 0, retrySkipped: 0, retryResourceErrors: 0, retryHistoryIncomplete: false});
});

test("first answer dates survive later snapshot replays", async () => {
 const { snapshotFromSession } = await import("./activity-record");
 const day1 = new Date(2026, 9, 27, 23, 59).getTime();
 const day2 = new Date(2026, 9, 28, 0, 1).getTime();
 const session = {id: "s", courseId: "course", contentVersion: "1", startedAt: day1, introduced: [], attempts: {
  a: {contentId: "a", first: true, kind: "picture-word", at: day1, result: {outcome:"answered",correct:true,support:"independent"}},
  b: {contentId: "b", first: true, kind: "picture-word", at: day2, result: {outcome:"answered",correct:true,support:"hinted"}},
 }} as unknown as import("./session").LearningSession;
 const snapshot = snapshotFromSession(session, "lesson", day2);
 assert.deepEqual(snapshot.answerDays, {a:"2026-10-27", b:"2026-10-28"});
 const record: ActivityRecord = {version:1, profileId:"child", courseId:"course", since:day1, sessions:{}};
 const saved = putActivitySnapshot(record, snapshot);
 const changed = putActivitySnapshot(saved, {...snapshot, answerDays:{a:"2026-10-28", b:"2026-10-28"}});
 assert.equal(changed.sessions.s.answerDays?.a, "2026-10-27");
});

test("weekly recognition buckets use saved days and distinguish undated history", async () => {
 const { recentRecognitionDays } = await import("./activity-record");
 const record: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:1,sessions:{s:{
  sessionId:"s",contentVersion:"1",mode:"lesson",startedAt:1,updatedAt:2,introduced:[],
  answers:{a:"independent",b:"hinted",c:"skipped",d:"resource-error",e:"assisted"},
  answerDays:{a:"2026-10-27",b:"2026-10-28",c:"2026-10-28",d:"2026-10-28"}
 }}};
 const result = recentRecognitionDays(record, new Date(2026,9,28,12));
 assert.equal(result.days.find(day => day.key === "2026-10-27")?.count,1);
 assert.equal(result.days.find(day => day.key === "2026-10-28")?.count,1);
 assert.equal(result.undated,1);
});

test("co-reading on two days is tracked by actual first viewing without duplicating a day", async () => {
 const { snapshotFromSession, recentRecognitionDays } = await import("./activity-record");
 const first = new Date(2026,9,27,23,59).getTime(), second = new Date(2026,9,28,0,1).getTime();
 const session = {id:"s", courseId:"course", contentVersion:"1", startedAt:first, introduced:["a"], attempts:{}, practice:[]} as unknown as import("./session").LearningSession;
 const record: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:first,sessions:{}};
 const saved = putActivitySnapshot(record, snapshotFromSession(session,"co-read",first));
 const next = putActivitySnapshot(saved, snapshotFromSession({...session,introduced:["a","b","c"]},"co-read",second));
 const days = recentRecognitionDays(next, new Date(2026,9,28,12)).days;
 assert.equal(days.find(d=>d.key === "2026-10-27")?.coRead, 1);
 assert.equal(days.find(d=>d.key === "2026-10-28")?.coRead, 1);
 assert.equal(next.sessions.s.introducedDays?.a, "2026-10-27");
});

test("invalid calendar days in imported activity records are rejected", () => {
 const record: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:1,sessions:{s:{
  sessionId:"s",contentVersion:"1",mode:"lesson",startedAt:1,updatedAt:2,introduced:["a"],answers:{a:"independent"},answerDays:{a:"2026-02-29"}
 }}};
 assert.equal(parseActivityRecord(record,"child","course"), null);
 record.sessions.s.answerDays = {a:"2028-02-29"};
 assert.ok(parseActivityRecord(record,"child","course"));
 record.sessions.s.introducedDays = {a:"2026-13-01"};
 assert.equal(parseActivityRecord(record,"child","course"), null);
});


test("unchanged session snapshots do not cause repeated storage writes", async () => {
 const { saveSessionActivity } = await import("./activity-record");
 const values = new Map<string,string>(); let writes = 0;
 const storage = {getItem:(key:string)=>values.get(key) ?? null,setItem:(key:string,value:string)=>{writes++; values.set(key,value);}};
 const session = {id:"s",courseId:"course",contentVersion:"1",startedAt:1,introduced:[],attempts:{},practice:[]} as unknown as import("./session").LearningSession;
 assert.equal(saveSessionActivity(storage,"child",session,"lesson",10),true);
 assert.equal(saveSessionActivity(storage,"child",session,"lesson",11),true);
 assert.equal(writes,1);
});


test("out-of-range dates cannot enter activity storage", () => {
 const record: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:9e15,sessions:{}};
 assert.equal(parseActivityRecord(record,"child","course"),null);
});


test("replaying old undated records does not invent dates for historical events", () => {
 const record: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:1,sessions:{s:{sessionId:"s",contentVersion:"1",mode:"lesson",startedAt:1,updatedAt:2,introduced:["a"],answers:{a:"independent"}}}};
 const updated = putActivitySnapshot(record,{...record.sessions.s,updatedAt:3,introduced:["a","b"],answers:{a:"independent",b:"hinted"},introducedDays:{a:"2026-10-27",b:"2026-10-28"},answerDays:{a:"2026-10-27",b:"2026-10-28"}});
 assert.deepEqual(updated.sessions.s.answerDays,{b:"2026-10-28"});
 assert.deepEqual(updated.sessions.s.introducedDays,{b:"2026-10-28"});
});


test("intro skips remain separate from recognition across replay", async () => {
 const { snapshotFromSession, summarizeActivity } = await import("./activity-record");
 const session = {id:"s",courseId:"course",contentVersion:"1",startedAt:1,introduced:[],practice:[],attempts:{a:{contentId:"a",kind:"intro",first:false,result:{outcome:"skipped",contentId:"a"}}}} as unknown as import("./session").LearningSession;
 const base: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const saved = putActivitySnapshot(base,snapshotFromSession(session,"co-read",2));
 const replayed = putActivitySnapshot(saved,snapshotFromSession({...session,attempts:{}},"co-read",3));
 assert.equal(summarizeActivity(replayed).introSkipped,1);
 assert.equal(summarizeActivity(replayed).skipped,0);
});

test("stored local dates remain unchanged after a time-zone change and replay", async () => {
 const { snapshotFromSession } = await import("./activity-record");
 const originalZone = process.env.TZ;
 try {
  const at = Date.UTC(2026,9,28,1);
  const session = {id:"s",courseId:"course",contentVersion:"1",startedAt:at,introduced:["a"],practice:[],attempts:{a:{contentId:"a",first:true,kind:"picture-word",at,result:{outcome:"answered",correct:true,support:"independent"}}}} as unknown as import("./session").LearningSession;
  process.env.TZ = "Asia/Shanghai";
  const base: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:at,sessions:{}};
  const saved = putActivitySnapshot(base,snapshotFromSession(session,"lesson",at));
  assert.equal(saved.sessions.s.answerDays?.a,"2026-10-28");
  assert.equal(saved.sessions.s.answerOffsets?.a,-480);
  process.env.TZ = "America/Los_Angeles";
  const replayed = putActivitySnapshot(saved,snapshotFromSession(session,"lesson",at + 1000));
  assert.equal(replayed.sessions.s.answerDays?.a,"2026-10-28");
  assert.equal(replayed.sessions.s.introducedDays?.a,"2026-10-28");
  assert.equal(replayed.sessions.s.answerOffsets?.a,-480);
  assert.equal(replayed.sessions.s.introducedOffsets?.a,-480);
 } finally { if (originalZone === undefined) delete process.env.TZ; else process.env.TZ = originalZone; }
});

test("event timestamps and offsets survive replay without filling legacy gaps", async () => {
 const { snapshotFromSession } = await import("./activity-record");
 const session = {id:"s",courseId:"course",contentVersion:"1",startedAt:1,introduced:["a"],practice:[],attempts:{a:{contentId:"a",first:true,kind:"picture-word",at:2,result:{outcome:"answered",correct:true,support:"independent"}}}} as unknown as import("./session").LearningSession;
 const base: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const saved = putActivitySnapshot(base,snapshotFromSession(session,"lesson",3));
 assert.equal(saved.sessions.s.answerTimes?.a,2);
 assert.equal(saved.sessions.s.introducedTimes?.a,3);
 const replayed = putActivitySnapshot(saved,snapshotFromSession(session,"lesson",4));
 assert.equal(replayed.sessions.s.introducedTimes?.a,3);
 const old = structuredClone(saved); delete old.sessions.s.answerTimes; delete old.sessions.s.introducedTimes;
 const restored = putActivitySnapshot(old,snapshotFromSession(session,"lesson",5));
 assert.equal(restored.sessions.s.answerTimes?.a,undefined);
 assert.equal(restored.sessions.s.introducedTimes?.a,undefined);
});

test("event date must match its timestamp and recorded time-zone offset", () => {
 const at = Date.UTC(2026,9,27,18);
 const record: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:at,sessions:{s:{sessionId:"s",contentVersion:"1",mode:"lesson",startedAt:at,updatedAt:at,introduced:[],answers:{a:"independent"},answerDays:{a:"2026-10-28"},answerTimes:{a:at},answerOffsets:{a:-480}}}};
 assert.ok(parseActivityRecord(record,"child","course"));
 record.sessions.s.answerDays = {a:"2026-10-27"};
 assert.equal(parseActivityRecord(record,"child","course"),null);
 delete record.sessions.s.answerOffsets;
 assert.ok(parseActivityRecord(record,"child","course"),"legacy records with missing offsets remain readable");
});


test("clock rollback retains new activity without replacing earlier outcomes", () => {
 const record: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:1,sessions:{s:{sessionId:"s",contentVersion:"1",mode:"lesson",startedAt:1,updatedAt:100,introduced:["a"],answers:{a:"hinted"}}}};
 const updated = putActivitySnapshot(record,{...record.sessions.s,updatedAt:90,introduced:["a","b"],answers:{a:"independent",b:"assisted"}});
 assert.equal(updated.sessions.s.updatedAt,100);
 assert.deepEqual(updated.sessions.s.introduced,["a","b"]);
 assert.deepEqual(updated.sessions.s.answers,{a:"hinted",b:"assisted"});
});

test("retry skips and resource faults remain separate and replay idempotently", async () => {
 const { snapshotFromSession, summarizeActivity } = await import("./activity-record");
 const session = {id:"s",courseId:"course",contentVersion:"1",startedAt:1,introduced:[],attempts:{},practice:[
  {result:{outcome:"skipped"}}, {result:{outcome:"resource-error"}}, {result:{outcome:"answered"}}
 ]} as unknown as import("./session").LearningSession;
 const base: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const saved=putActivitySnapshot(base,snapshotFromSession(session,"lesson",2));
 const replayed=putActivitySnapshot(saved,snapshotFromSession(session,"lesson",3));
 const totals=summarizeActivity(replayed);
 assert.equal(totals.retrySkipped,1); assert.equal(totals.retryResourceErrors,1); assert.equal(totals.skipped,0);
});


test("truncated retry history is marked incomplete rather than assigning shifted identities", async () => {
 const { snapshotFromSession, summarizeActivity } = await import("./activity-record");
 const session = {id:"s",courseId:"course",contentVersion:"1",startedAt:1,introduced:[],attempts:{},practice:Array.from({length:1000},()=>({result:{outcome:"skipped"}}))} as unknown as import("./session").LearningSession;
 const base: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const saved=putActivitySnapshot(base,snapshotFromSession(session,"lesson",2));
 const totals=summarizeActivity(saved);
 assert.equal(totals.retryHistoryIncomplete,true);
 assert.equal(totals.retrySkipped,0);
});

test("retry media failures never become wrong answers or independent successes", async () => {
 const { snapshotFromSession, summarizeActivity } = await import("./activity-record");
 const session = {id:"retry",courseId:"primary-starter",contentVersion:"1",startedAt:1,introduced:[],attempts:{a:{contentId:"a",kind:"picture-word",first:true,at:2,result:{outcome:"answered",contentId:"a",correct:false,support:"independent"}}},practice:[{contentId:"a",kind:"listen-word",first:false,result:{outcome:"resource-error",contentId:"a"}}]} as unknown as import("./session").LearningSession;
 const base: ActivityRecord={version:1,profileId:"child",courseId:"primary-starter",since:1,sessions:{}};
 const first=putActivitySnapshot(base,snapshotFromSession(session,"lesson",3));
 const totals=summarizeActivity(putActivitySnapshot(first,snapshotFromSession(session,"lesson",4)));
 assert.equal(totals.incorrect,1);
 assert.equal(totals.independent,0);
 assert.equal(totals.resourceErrors,0);
 assert.equal(totals.retryResourceErrors,1);
});

test("finished activity remains finished on replay and invalid end markers are rejected", async () => {
 const { snapshotFromSession } = await import("./activity-record");
 const session = {id:"s",courseId:"course",contentVersion:"1",startedAt:1,endedAt:5,endReason:"completed",introduced:[],attempts:{},practice:[]} as unknown as import("./session").LearningSession;
 const base: ActivityRecord = {version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const saved=putActivitySnapshot(base,snapshotFromSession(session,"lesson",5));
 const replay=putActivitySnapshot(saved,snapshotFromSession({...session,endedAt:undefined,endReason:undefined},"lesson",6));
 assert.equal(replay.sessions.s.endReason,"completed");
 assert.equal(replay.sessions.s.endedAt,5);
 assert.equal(parseActivityRecord({...base,sessions:{s:{...saved.sessions.s,endReason:undefined}}},"child","course"),null);
});

test("intro skip timestamps persist without inventing old missing times", async () => {
 const { snapshotFromSession } = await import("./activity-record");
 const session = {id:"s",courseId:"course",contentVersion:"1",startedAt:1,introduced:[],practice:[],attempts:{a:{contentId:"a",kind:"intro",first:false,at:5,result:{outcome:"skipped",contentId:"a"}}}} as unknown as import("./session").LearningSession;
 const base:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const saved=putActivitySnapshot(base,snapshotFromSession(session,"co-read",6));
 assert.equal(saved.sessions.s.introSkipTimes?.a,5);
 const legacy=structuredClone(saved); delete legacy.sessions.s.introSkipTimes;
 const replay=putActivitySnapshot(legacy,snapshotFromSession(session,"co-read",7));
 assert.equal(replay.sessions.s.introSkipTimes?.a,undefined);
});

test("retry event timestamps survive replay without filling missing historical timestamps", async () => {
 const { snapshotFromSession } = await import("./activity-record");
 const session={id:"s",courseId:"course",contentVersion:"1",startedAt:1,introduced:[],attempts:{},practice:[{at:5,result:{outcome:"resource-error"}}]} as unknown as import("./session").LearningSession;
 const base:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const saved=putActivitySnapshot(base,snapshotFromSession(session,"lesson",6));
 assert.equal(saved.sessions.s.retryEventTimes?.['retry-0'],5);
 const legacy=structuredClone(saved); delete legacy.sessions.s.retryEventTimes;
 const replay=putActivitySnapshot(legacy,snapshotFromSession(session,"lesson",7));
 assert.equal(replay.sessions.s.retryEventTimes?.['retry-0'],undefined);
});

test("validated course upgrades preserve original session version and allow new activity", () => {
 const old:ActivitySnapshot={sessionId:"s",contentVersion:"0.3.0-draft",mode:"lesson",startedAt:1,updatedAt:2,introduced:["a"],answers:{a:"hinted"}};
 const record:ActivityRecord={version:1,profileId:"child",courseId:"primary-starter",since:1,sessions:{s:old}};
 const updated=putActivitySnapshot(record,{...old,contentVersion:"0.4.0-draft",updatedAt:3,introduced:["a","b"],answers:{a:"hinted",b:"independent"}});
 assert.equal(updated.sessions.s.contentVersion,"0.3.0-draft");
 assert.deepEqual(updated.sessions.s.contentVersions,["0.3.0-draft","0.4.0-draft"]);
 assert.equal(updated.sessions.s.answers.b,"independent");
 assert.ok(parseActivityRecord(updated,"child","primary-starter"));
 assert.throws(()=>putActivitySnapshot(record,{...old,contentVersion:"9.0",updatedAt:3}));
});

test("Hanzi course upgrades preserve version provenance and reject cross-course versions", () => {
 const old:ActivitySnapshot={sessionId:"s",contentVersion:"0.6.0-draft",mode:"co-read",startedAt:1,updatedAt:2,introduced:[],answers:{}};
 const record:ActivityRecord={version:1,profileId:"child",courseId:"hanzi-starter",since:1,sessions:{s:old}};
 const updated=putActivitySnapshot(record,{...old,contentVersion:"0.7.0-draft",updatedAt:3,introduced:["hanzi1"]});
 assert.deepEqual(updated.sessions.s.contentVersions,["0.6.0-draft","0.7.0-draft"]);
 assert.throws(()=>putActivitySnapshot(record,{...old,contentVersion:"0.4.0-draft",updatedAt:3}));
});
