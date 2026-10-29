import { test } from "node:test";
import assert from "node:assert/strict";
import { activityKey, type ActivityRecord } from "./activity-record";
import { replaceActivityWithBackup } from "./activity-transaction";

test("activity replacement backs up first and rejects conflicts", () => {
 const values=new Map<string,string>();
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const key=activityKey("child","course"), original=JSON.stringify(record);
 values.set(key,original);
 assert.deepEqual(replaceActivityWithBackup(storage,"child","course","stale",record),{ok:false,reason:"conflict"});
 assert.deepEqual(replaceActivityWithBackup(storage,"child","course",original,{...record,since:2}),{ok:true});
 assert.equal(JSON.parse(values.get(`word-atlas:v3:activity-archive-backup:child:course`)!).raw,original);
 values.set(key,original);
 assert.equal(replaceActivityWithBackup(storage,"child","course",original,record).ok,false, "a rolled-back backup is retained");
});

test("multiple archives retain prior summaries and the newest backup recovers the last transaction", async () => {
 const { archiveActivityWithBackup, restoreActivityArchiveBackup } = await import("./activity-transaction");
 const values=new Map<string,string>();
 const storage={get length(){return values.size;},key:(i:number)=>[...values.keys()][i]??null,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const make=(id:string,at:number)=>({sessionId:id,contentVersion:"1",mode:"lesson" as const,startedAt:at,updatedAt:at,endedAt:at,endReason:"completed" as const,introduced:[],answers:{},introSkipped:[],retryEvents:{}});
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{first:make("first",1),later:make("later",150*86400000)}};
 const key=activityKey("child","course"); values.set(key,JSON.stringify(record));
 assert.deepEqual(archiveActivityWithBackup(storage,"child","course",200*86400000),{ok:true,archived:1});
 const beforeSecond=values.get(key)!;
 assert.deepEqual(archiveActivityWithBackup(storage,"child","course",300*86400000),{ok:true,archived:1});
 assert.deepEqual(Object.keys(JSON.parse(values.get(key)!).archivedSessions).sort(),["first","later"]);
 assert.equal(restoreActivityArchiveBackup(storage,"child","course",values.get(key)!).ok,true);
 assert.equal(values.get(key),beforeSecond);
});

test("failure while rotating a backup preserves both the previous backup and current record", async () => {
 const { archiveActivityWithBackup } = await import("./activity-transaction");
 const values=new Map<string,string>(); let failBackup=false;
 const storage={get length(){return values.size;},key:(i:number)=>[...values.keys()][i]??null,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(failBackup && k.startsWith("word-atlas:v3:activity-archive-backup:")) throw new Error("quota"); values.set(k,v);}};
 const make=(id:string,at:number)=>({sessionId:id,contentVersion:"1",mode:"lesson" as const,startedAt:at,updatedAt:at,endedAt:at,endReason:"completed" as const,introduced:[],answers:{},introSkipped:[],retryEvents:{}});
 const key=activityKey("child","course"), backupKey="word-atlas:v3:activity-archive-backup:child:course";
 values.set(key,JSON.stringify({version:1,profileId:"child",courseId:"course",since:1,sessions:{first:make("first",1),later:make("later",150*86400000)}}));
 assert.equal(archiveActivityWithBackup(storage,"child","course",200*86400000).ok,true);
 const current=values.get(key), backup=values.get(backupKey); failBackup=true;
 assert.deepEqual(archiveActivityWithBackup(storage,"child","course",300*86400000),{ok:false,reason:"write-failed"});
 assert.equal(values.get(key),current); assert.equal(values.get(backupKey),backup);
});

test("rotation keeps the old backup when a previously recorded event timestamp changes", async () => {
 const { archiveActivityWithBackup } = await import("./activity-transaction");
 const values=new Map<string,string>();
 const storage={get length(){return values.size;},key:(i:number)=>[...values.keys()][i]??null,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const make=(id:string,at:number)=>({sessionId:id,contentVersion:"1",mode:"lesson" as const,startedAt:at,updatedAt:at+2,endedAt:at+2,endReason:"completed" as const,introduced:[],answers:{},introSkipped:["a"],introSkipTimes:{a:at+1},retryEvents:{}});
 const key=activityKey("child","course"), backupKey="word-atlas:v3:activity-archive-backup:child:course";
 values.set(key,JSON.stringify({version:1,profileId:"child",courseId:"course",since:1,sessions:{first:make("first",1),later:make("later",150*86400000)}}));
 assert.equal(archiveActivityWithBackup(storage,"child","course",200*86400000).ok,true);
 const before=values.get(backupKey), record=JSON.parse(values.get(key)!);
 record.sessions.later.introSkipTimes.a++;
 values.set(key,JSON.stringify(record));
 assert.deepEqual(archiveActivityWithBackup(storage,"child","course",300*86400000),{ok:false,reason:"backup-exists"});
 assert.equal(values.get(backupKey),before);
});

test("failed replacement leaves a recoverable backup and preserves original", () => {
 const values=new Map<string,string>(); let fail=false;
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(fail && !k.startsWith('word-atlas:v3:activity-archive-backup:')) throw new Error('quota'); values.set(k,v);}};
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const key=activityKey("child","course"), original=JSON.stringify(record); values.set(key,original); fail=true;
 assert.deepEqual(replaceActivityWithBackup(storage,"child","course",original,{...record,since:2}),{ok:false,reason:"write-failed"});
 assert.equal(values.get(key),original);
 assert.equal(JSON.parse(values.get(`word-atlas:v3:activity-archive-backup:child:course`)!).raw,original);
});

test("archive recovery requires current value to match and retains the original backup", async () => {
 const { restoreActivityArchiveBackup } = await import("./activity-transaction");
 const values=new Map<string,string>();
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const key=activityKey("child","course"), original=JSON.stringify(record);
 values.set(key,original);
 assert.equal(replaceActivityWithBackup(storage,"child","course",original,{...record,since:2}).ok,true);
 const current=values.get(key)!;
 assert.deepEqual(restoreActivityArchiveBackup(storage,"child","course","stale"),{ok:false,reason:"conflict"});
 assert.deepEqual(restoreActivityArchiveBackup(storage,"child","course",current),{ok:true});
 assert.equal(values.get(key),original);
 assert.ok(values.has('word-atlas:v3:activity-archive-backup:child:course'));
});

test("recovery never overwrites learning added after compaction", async () => {
 const { restoreActivityArchiveBackup } = await import("./activity-transaction");
 const values=new Map<string,string>();
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{}};
 const key=activityKey("child","course"), original=JSON.stringify(record); values.set(key,original);
 assert.equal(replaceActivityWithBackup(storage,"child","course",original,{...record,since:2}).ok,true);
 const newer=JSON.stringify({...record,since:3}); values.set(key,newer);
 assert.deepEqual(restoreActivityArchiveBackup(storage,"child","course",newer),{ok:false,reason:"conflict"});
 assert.equal(values.get(key),newer);
});

test("archive transaction protects checkpoints and can restore the original data", async () => {
 const { archiveActivityWithBackup, restoreActivityArchiveBackup } = await import("./activity-transaction");
 const values=new Map<string,string>();
 const storage={get length(){return values.size;},key:(i:number)=>[...values.keys()][i]??null,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const make=(id:string)=>({sessionId:id,contentVersion:"1",mode:"lesson" as const,startedAt:1,updatedAt:2,endedAt:2,endReason:"completed" as const,introduced:[],answers:{},introSkipped:[],retryEvents:{}});
 const record:ActivityRecord={version:1,profileId:"child",courseId:"course",since:1,sessions:{old:make("old"), protected:make("protected")}};
 const key=activityKey("child","course"), original=JSON.stringify(record);
 const checkpoint="word-atlas:v3:primary-session:child:course:lesson";
 values.set(key,original);
 values.set(checkpoint,JSON.stringify({version:1,profileId:"child",courseId:"course",session:{id:"protected"}}));
 assert.deepEqual(archiveActivityWithBackup(storage,"child","course",200*86400000),{ok:true,archived:1});
 const replacement=JSON.parse(values.get(key)!);
 assert.ok(replacement.archivedSessions.old);
 assert.ok(replacement.sessions.protected);
 assert.deepEqual(restoreActivityArchiveBackup(storage,"child","course",values.get(key)!),{ok:true});
 assert.equal(values.get(key),original);
 values.set(checkpoint,"broken");
 assert.deepEqual(archiveActivityWithBackup(storage,"child","course",200*86400000),{ok:false,reason:"inventory-failed"});
 assert.equal(values.get(key),original);
});
