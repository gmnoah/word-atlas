import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 const context = await browser.newContext();
 const pages = await Promise.all([context.newPage(),context.newPage()]);
 await Promise.all(pages.map(page => page.goto('http://localhost:5188/#/explore?course=hanzi-starter')));
 await Promise.all(pages.map((page,index) => page.locator('.hanzi-map-stop').nth(index).getByRole('button',{name:'只读一读'}).click()));
 await Promise.all(pages.map(page => page.getByRole('button',{name:'看过啦，下一个'}).click()));
 await pages[0].waitForFunction(() => {
  const raw = localStorage.getItem('word-atlas:v3:activity:learner-default:hanzi-starter');
  if (!raw) return false;
  return Object.values(JSON.parse(raw).sessions).filter(s => s.introduced.length > 0).length === 2;
 });
 const record = await pages[0].evaluate(() => JSON.parse(localStorage.getItem('word-atlas:v3:activity:learner-default:hanzi-starter')));
 assert.equal(Object.values(record.sessions).filter(s => s.introduced.length > 0).length,2);
 console.log('两标签页同时共读不同主题均保留活动记录');
 await context.close();
} finally { await browser.close(); }
