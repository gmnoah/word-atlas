import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for(const course of ['primary-starter','hanzi-starter']) for(const width of [375,1280]) for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'});
  await context.addInitScript(theme=>localStorage.setItem('word-atlas:settings',JSON.stringify({theme,onboarded:true,splash:false})),theme);
  const page=await context.newPage(); await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
  const stop=page.locator('.journey-stop').first();
  await stop.getByRole('button',{name:course==='hanzi-starter'?'一起读一读':'开始小课'}).click();
  await page.getByRole('button',{name:course==='hanzi-starter'?'看过啦，下一个':'认识了，继续'}).click();
  await page.getByRole('button',{name:'返回主题'}).click(); await page.getByRole('button',{name:'结束体验'}).click();
  await page.getByRole('button',{name:'学习记录'}).click();
  const summary=page.getByRole('region',{name:'详细活动记录'});
  await summary.getByRole('heading',{name:'近七天活动'}).waitFor();
  const latest=summary.locator('.activity-week li').last();
  await latest.getByText(course==='hanzi-starter'?'有日期看过 1 次 · 识别 0 次 · 共读 1 次':'有日期看过 1 次 · 识别 0 次').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.reload(); await page.getByRole('region',{name:'详细活动记录'}).locator('.activity-week li').last().getByText(/有日期看过 1 次/).waitFor();
  await context.close();
 }
 console.log('两课程看过活动的逐日统计、刷新和窄屏主题通过');
} finally {await browser.close();}
