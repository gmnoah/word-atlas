import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for(const course of ['primary-starter','hanzi-starter']) {
  const context=await browser.newContext();
  const page=await context.newPage(), other=await context.newPage();
  await page.goto(`http://localhost:5188/#/explore?course=${course}`);
  await other.goto('http://localhost:5188/');
  if(course==='primary-starter') await page.getByRole('button',{name:'开始小课'}).first().click();
  else await page.locator('.hanzi-map-stop').first().getByRole('button',{name:'只读一读'}).click();
  const prefix=course==='primary-starter'?'word-atlas:v3:primary-session:':'word-atlas:v3:hanzi-session:';
  await page.waitForFunction(prefix=>Object.keys(localStorage).some(k=>k.startsWith(prefix)),prefix);
  const result=await other.evaluate(async()=>{const {applyRestoreWithLock}=await import('/src/profiles/backup.ts');return applyRestoreWithLock(localStorage,{kind:'v3',records:{'word-atlas:settings':{}},courses:[],profileCount:1});});
  assert.equal(result.ok,true);
  await page.getByRole('button',{name:course==='primary-starter'?'认识了，继续':'看过啦，下一个'}).click();
  await page.getByRole('alert').filter({hasText:'暂时无法保存'}).waitFor();
  assert.equal(await page.evaluate(prefix=>Object.keys(localStorage).some(k=>k.startsWith(prefix)),prefix),false);
  await context.close();
 }
 console.log('两课程恢复后旧小课阻止写入并提示通过');
} finally {await browser.close();}
