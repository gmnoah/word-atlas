import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 const context=await browser.newContext();
 const page=await context.newPage();
 await page.goto('http://localhost:5188/#/explore?course=hanzi-starter');
 for(const index of [0,1]){
  const stop=page.locator('.hanzi-map-stop').nth(index);
  await stop.waitFor();
  const title=await stop.locator('h3').innerText();
  await stop.getByRole('button',{name:index === 0 ? '只读一读' : '认一认'}).click();
  await page.getByRole('button',{name:index === 0 ? '看过啦，下一个' : '认识了，继续'}).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button',{name:'返回主题'}).click();
  await page.getByRole('button',{name:'结束体验'}).click();
  await page.getByRole('heading',{name:'汉字启蒙',exact:true}).waitFor();
  if(index===1){
   await page.getByRole('button',{name:'今日旅程'}).click();
   await page.getByRole('button',{name:`继续认一认：${title}`}).waitFor();
   assert.ok(await page.getByRole('button',{name:`继续认一认：${title}`}).isVisible());
  }
 }
 await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('word-atlas:v3:hanzi-session:') && k.endsWith(':co-read'));localStorage.setItem(key,'broken');});
 await page.reload();
 await page.getByText('部分小课记录无法读取，原记录已保留；可以选择其他主题。').waitFor();
 await page.getByRole('button',{name:/继续认一认/}).waitFor();
 assert.equal(await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('word-atlas:v3:hanzi-session:') && k.endsWith(':co-read'));return localStorage.getItem(key);}), 'broken');
 console.log('跨模式最近续学与损坏断点保留提示通过');
 await context.close();
} finally {await browser.close();}
