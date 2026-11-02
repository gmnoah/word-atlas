import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
const fixed=Date.UTC(2026,9,29,12), first=Date.UTC(2026,9,28,15,59), second=Date.UTC(2026,9,28,16,1);
async function contextAt(timezone, seed) {
 const context=await browser.newContext({timezoneId:timezone,serviceWorkers:'block',viewport:{width:375,height:850}});
 await context.addInitScript(({fixed,seed})=>{
  const NativeDate=Date;
  class FixedDate extends NativeDate { constructor(...args){ if(args.length) super(...args); else super(fixed); } static now(){return fixed;} }
  window.Date=FixedDate;
  localStorage.setItem('word-atlas:settings',JSON.stringify({theme:'dark',onboarded:true,splash:false}));
  if(seed) localStorage.setItem(seed.key,seed.value);
 },{fixed,seed});
 return context;
}
try {
 for(const course of ['primary-starter','hanzi-starter']) {
  const source=await contextAt('Asia/Shanghai'); const page=await source.newPage();
  await page.goto(`http://localhost:5188/#/explore?course=${course}&view=records`);
  const saved=await page.evaluate(async({course,first,second})=>{
   const {putActivitySnapshot,snapshotFromSession}=await import('/src/learning/activity-record.ts');
   const mode=course==='hanzi-starter'?'co-read':'lesson', ids=course==='hanzi-starter'?['hanzi-u5c71','hanzi-u6c34']:['en-apple','en-pear'];
   const attempt=(id,at)=>({contentId:id,first:true,kind:'picture-word',at,result:{outcome:'answered',contentId:id,correct:true,support:'independent'}});
   const session={id:'timezone-test',courseId:course,contentVersion:'test',startedAt:first,introduced:[ids[0]],attempts:mode==='lesson'?{[ids[0]]:attempt(ids[0],first)}:{},practice:[]};
   const original={version:1,profileId:'learner-default',courseId:course,since:first,sessions:{}};
   const a=putActivitySnapshot(original,snapshotFromSession(session,mode,first));
   session.introduced.push(ids[1]); if(mode==='lesson') session.attempts[ids[1]]=attempt(ids[1],second);
   const b=putActivitySnapshot(a,snapshotFromSession(session,mode,second));
   const key=`word-atlas:v3:activity:learner-default:${course}`, value=JSON.stringify(b); localStorage.setItem(key,value); return {key,value,session,mode};
  },{course,first,second});
  const snapshot=JSON.parse(saved.value).sessions['timezone-test'];
  assert.deepEqual(Object.values(snapshot.introducedDays).sort(),['2026-10-28','2026-10-29']);
  assert.deepEqual(Object.values(snapshot.introducedOffsets),[-480,-480]);
  await page.reload();
  const summary=page.getByRole('region',{name:'详细活动记录'});
  await summary.locator('.activity-week li').filter({hasText:'10-28'}).getByText(/看过 1/).waitFor();
  await summary.locator('.activity-week li').filter({hasText:'10-29'}).getByText(/看过 1/).waitFor();
  const other=await contextAt('America/Los_Angeles',saved); const p2=await other.newPage();
  await p2.goto(`http://localhost:5188/#/explore?course=${course}&view=records`);
  const s2=p2.getByRole('region',{name:'详细活动记录'});
  const expected=course==='hanzi-starter'?'看过 1 · 识别 0 · 共读 1':'看过 1 · 识别 1';
  await s2.locator('.activity-week li').filter({hasText:'10-28'}).getByText(expected).waitFor();
  await s2.locator('.activity-week li').filter({hasText:'10-29'}).getByText(expected).waitFor();
  const replay=await p2.evaluate(async({key,session,mode,second})=>{const {putActivitySnapshot,snapshotFromSession}=await import('/src/learning/activity-record.ts');return putActivitySnapshot(JSON.parse(localStorage.getItem(key)),snapshotFromSession(session,mode,second)).sessions['timezone-test'];},{...saved,second});
  assert.deepEqual(replay.introducedDays,snapshot.introducedDays); assert.deepEqual(replay.introducedOffsets,snapshot.introducedOffsets);
  if(course==='primary-starter') {assert.deepEqual(replay.answerDays,snapshot.answerDays);assert.deepEqual(replay.answerOffsets,snapshot.answerOffsets);}
  assert.equal(await p2.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await other.close(); await source.close();
 }
 console.log('两课程模拟跨午夜、切换时区和重放保持已记录日期通过');
} finally {await browser.close();}
