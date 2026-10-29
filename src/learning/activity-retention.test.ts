import { test } from "node:test";
import assert from "node:assert/strict";
import { activityArchiveCandidates } from "./activity-retention";
import type { ActivityRecord, ActivitySnapshot } from "./activity-record";
test("only old completed sessions without recoverable checkpoints are archive candidates", () => {
 const now = 200 * 86400000;
 const make = (sessionId:string, extra:Partial<ActivitySnapshot> = {}):ActivitySnapshot => ({sessionId,contentVersion:"1",mode:"lesson",startedAt:1,updatedAt:2,introduced:[],answers:{},...extra});
 const sessions = {old:make("old",{endedAt:2,endReason:"completed"}), active:make("active"), protected:make("protected",{endedAt:2,endReason:"completed"}), recent:make("recent",{endedAt:now-86400000,endReason:"completed"}), anomalous:make("anomalous",{endedAt:2,endReason:"completed",answerTimes:{a:3}})};
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions};
 assert.deepEqual(activityArchiveCandidates(record,now,new Set(["protected"])),["old"]);
 assert.deepEqual(activityArchiveCandidates(record,NaN,new Set()),[]);
});

test("checkpoint inventory protects both course modes and rejects damaged state", async () => {
 const { protectedActivitySessions } = await import("./activity-retention");
 const entries = new Map<string,string>();
 const storage = { get length(){return entries.size;}, key:(i:number)=>[...entries.keys()][i]??null, getItem:(key:string)=>entries.get(key)??null };
 const key="word-atlas:v3:hanzi-session:child:hanzi-starter:nature:co-read";
 entries.set(key,JSON.stringify({version:1,profileId:"child",courseId:"hanzi-starter",session:{id:"session-1"}}));
 entries.set("word-atlas:v3:hanzi-session:other:hanzi-starter:nature:lesson","broken");
 const result=protectedActivitySessions(storage,"child","hanzi-starter");
 assert.equal(result.ok,true);
 if(result.ok) assert.deepEqual([...result.ids],["session-1"]);
 entries.set(key,"broken");
 assert.equal(protectedActivitySessions(storage,"child","hanzi-starter").ok,false);
});


test("sessions with incomplete event history are not selected for archive", () => {
 const now=200*86400000;
 const make=(id:string,extra:Partial<ActivitySnapshot>):ActivitySnapshot=>({sessionId:id,contentVersion:"1",mode:"lesson",startedAt:1,updatedAt:2,endedAt:2,endReason:"completed",introduced:[],answers:{},...extra});
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{
  old:make("old",{answers:{a:"independent"}}), skipped:make("skipped",{introSkipped:["a"]}), retry:make("retry",{retryEvents:{"retry-0":"skipped"}}), clean:make("clean",{})
 }};
 assert.deepEqual(activityArchiveCandidates(record,now,new Set()),["clean"]);
});


test("old intro skips are eligible only when all skip times are safely before completion", () => {
 const now=200*86400000;
 const session:ActivitySnapshot={sessionId:"s",contentVersion:"1",mode:"co-read",startedAt:1,updatedAt:3,endedAt:3,endReason:"completed",introduced:[],answers:{},introSkipped:["a"],introSkipTimes:{a:2}};
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{s:session}};
 assert.deepEqual(activityArchiveCandidates(record,now,new Set()),["s"]);
 session.introSkipTimes={a:4};
 assert.deepEqual(activityArchiveCandidates(record,now,new Set()),[]);
});


test("retry events require known times before an ended session can be considered", () => {
 const now=200*86400000;
 const session:ActivitySnapshot={sessionId:"s",contentVersion:"1",mode:"lesson",startedAt:1,updatedAt:3,endedAt:3,endReason:"completed",introduced:[],answers:{},retryEvents:{"retry-0":"resource-error"},retryEventTimes:{"retry-0":2}};
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{s:session}};
 assert.deepEqual(activityArchiveCandidates(record,now,new Set()),["s"]);
 session.retryEventTimes={"retry-0":4};
 assert.deepEqual(activityArchiveCandidates(record,now,new Set()),[]);
 session.retryHistoryIncomplete=true;
 assert.deepEqual(activityArchiveCandidates(record,now,new Set()),[]);
});

test("archive preview preserves outcome categories and does not change the original record", async () => {
 const { activityArchivePreview } = await import("./activity-retention");
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{s:{sessionId:"s",contentVersion:"1",mode:"lesson",startedAt:1,updatedAt:5,endedAt:5,endReason:"completed",introduced:["a"],introSkipped:["b"],answers:{a:"hinted",b:"resource-error"},retryEvents:{"retry-0":"skipped"}}}};
 const original=structuredClone(record);
 const preview=activityArchivePreview(record,["s","s"]);
 assert.equal(preview.totals.sessions,1);
 assert.equal(preview.totals.hinted,1);
 assert.equal(preview.totals.resourceErrors,1);
 assert.equal(preview.totals.introSkipped,1);
 assert.equal(preview.totals.retrySkipped,1);
 assert.deepEqual(record,original);
 assert.throws(()=>activityArchivePreview(record,["missing"]));
});

test("archive preview matches the existing learning summary for every outcome", async () => {
 const { activityArchivePreview } = await import("./activity-retention");
 const { summarizeActivity } = await import("./activity-record");
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{
  s:{sessionId:"s",contentVersion:"1",mode:"lesson",startedAt:1,updatedAt:2,introduced:["a"],introSkipped:["b"],answers:{a:"independent",b:"hinted",c:"assisted",d:"incorrect",e:"skipped",f:"resource-error"},retryEvents:{"retry-0":"skipped","retry-1":"resource-error"}},
  t:{sessionId:"t",contentVersion:"1",mode:"co-read",startedAt:1,updatedAt:2,introduced:["a"],answers:{}}
 }};
 const preview=activityArchivePreview(record,["s","t"]);
 const summary=summarizeActivity(record);
 for(const key of ["independent","hinted","assisted","incorrect","skipped","resourceErrors","introSkipped","retrySkipped","retryResourceErrors","coReadSessions"] as const) assert.equal(preview.totals[key],summary[key],key);
 assert.equal(preview.totals.introductionEvents,2,"view events are not distinct learned items");
});

test("archive preparation keeps session identity and unknown history without mutating live records", async () => {
 const { prepareActivityArchive } = await import("./activity-retention");
 const now=200*86400000;
 const session:ActivitySnapshot={sessionId:"s",contentVersion:"1",mode:"lesson",startedAt:1,updatedAt:3,endedAt:3,endReason:"completed",introduced:[],answers:{}};
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{s:session}};
 const before=structuredClone(record);
 const archive=prepareActivityArchive(record,now,new Set());
 assert.equal(archive.length,1);
 assert.equal(archive[0].sessionId,"s");
 assert.equal(archive[0].introHistoryKnown,false);
 assert.equal(archive[0].retryHistoryKnown,false);
 assert.deepEqual(record,before);
 assert.deepEqual(prepareActivityArchive(record,now,new Set(["s"])),[]);
});

test("compaction preserves categorized totals, daily activity, provenance, and replay protection", async () => {
 const { compactActivityRecord } = await import("./activity-retention");
 const { summarizeActivity, recentRecognitionDays, putActivitySnapshot, parseActivityRecord } = await import("./activity-record");
 const time=Date.UTC(2025,0,1,12), day="2025-01-01", now=time+100*86400000;
 const lesson:ActivitySnapshot={sessionId:"lesson",contentVersion:"old",contentVersions:["old","new"],mode:"lesson",startedAt:time,updatedAt:time,endedAt:time,endReason:"completed",introduced:["a"],introducedDays:{a:day},introducedTimes:{a:time},introducedOffsets:{a:0},answers:{a:"hinted",b:"resource-error"},answerDays:{a:day,b:day},answerTimes:{a:time,b:time},answerOffsets:{a:0,b:0},introSkipped:[],retryEvents:{}};
 const reading:ActivitySnapshot={sessionId:"reading",contentVersion:"1",mode:"co-read",startedAt:time,updatedAt:time,endedAt:time,endReason:"completed",introduced:["a","b"],introducedDays:{a:day,b:day},introducedTimes:{a:time,b:time},introducedOffsets:{a:0,b:0},answers:{},introSkipped:[],retryEvents:{}};
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:time,sessions:{lesson,reading}};
 const before=structuredClone(record);
 const result=compactActivityRecord(record,now,new Set());
 assert.deepEqual(record,before);
 assert.deepEqual(summarizeActivity(result),summarizeActivity(record));
 assert.deepEqual(recentRecognitionDays(result,new Date(2025,0,2)),recentRecognitionDays(record,new Date(2025,0,2)));
 assert.deepEqual(result.archivedSessions?.lesson.contentVersions,["old","new"]);
 assert.throws(()=>putActivitySnapshot(result,lesson));
 assert.ok(parseActivityRecord(JSON.parse(JSON.stringify(result)),"child","course"));
 assert.deepEqual(compactActivityRecord(result,now,new Set()),result);
 const damaged=structuredClone(result); damaged.archivedSessions!.lesson.totals.hinted=2;
 assert.equal(parseActivityRecord(damaged,"child","course"),null);
});
