import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.addInitScript(()=>localStorage.setItem('word-atlas:settings',JSON.stringify({onboarded:true,splash:false})));
 const first=await context.newPage(), second=await context.newPage();
 await Promise.all([first.goto('http://localhost:5188/'),second.goto('http://localhost:5188/')]);
 await first.evaluate(async()=>{const {store}=await import('/src/store/store.ts');store.useDataset('word-atlas-open');});
 await first.evaluate(async () => {
  const {withPrimaryLock}=await import('/src/learning/primary-progress.ts');
  window.releaseCourse = null;
  window.courseLock = withPrimaryLock('child','primary-starter',()=>new Promise(resolve=>{ window.releaseCourse=resolve; }));
 });
 await first.waitForFunction(()=>typeof window.releaseCourse === 'function');
 await second.evaluate(async()=>{
  const {applyRestoreWithLock}=await import('/src/profiles/backup.ts');
  window.restored=false;
  window.restoreTask=applyRestoreWithLock(localStorage,{kind:'v3',records:{'word-atlas:settings':{onboarded:true,splash:false}},courses:[],profileCount:1}).then(result=>{window.restoreResult=result;window.restored=true;});
 });
 await second.waitForTimeout(250);
 assert.equal(await second.evaluate(()=>window.restored),false,'restore must wait for active course save');
 await first.evaluate(()=>window.releaseCourse());
 await second.waitForFunction(()=>window.restored);
 assert.equal(await second.evaluate(()=>window.restoreResult.ok),true);
 const staleRejected=await first.evaluate(async()=>{
  const {withPrimaryLock}=await import('/src/learning/primary-progress.ts');
  try { await withPrimaryLock('child','primary-starter',()=>localStorage.setItem('stale-write','bad'),null); return false; }
  catch { return localStorage.getItem('stale-write') === null; }
 });
 assert.equal(staleRejected,true,'a lesson from before restore must not write afterward');
 await first.getByRole('button',{name:/切换到(浅色|深色)/}).click();
 await first.waitForTimeout(400);
 assert.equal(await first.evaluate(()=>localStorage.getItem('word-atlas:v2:word-atlas-open')),null,'a stale IELTS tab must not recreate old progress after restore');
 await first.evaluate(()=>{location.hash='#/me';});
 await first.getByText('学习记录暂时无法保存。如果刚恢复了备份，请刷新页面后继续；否则请检查浏览器存储空间并及时备份。').waitFor();
 for (const width of [375,1280]) {
  await first.setViewportSize({width,height:800});
  assert.equal(await first.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
 }
 await context.close();
 console.log('跨标签页课程锁与完整恢复锁串行通过');
} finally { await browser.close(); }
