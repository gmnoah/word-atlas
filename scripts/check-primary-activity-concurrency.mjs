import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for (const same of [false,true]) {
  const context = await browser.newContext();
  const pages = await Promise.all([context.newPage(),context.newPage()]);
  await Promise.all(pages.map(page => page.goto('http://localhost:5188/#/explore?course=primary-starter')));
  await pages[0].getByRole('button',{name:'开始小课',exact:true}).first().click();
  await pages[0].getByRole('button',{name:'认识了，继续'}).waitFor();
  await pages[1].getByRole('button',{name:'开始小课',exact:true}).nth(same ? 0 : 1).click();
  await pages[1].getByRole('button',{name:'认识了，继续'}).waitFor();
  await pages[1].getByRole('button',{name:'认识了，继续'}).click();
  await pages[0].getByRole('button',{name:'认识了，继续'}).click();
  if (same) await pages[0].getByText(/本地记录不可用或已在其他页面更改/).waitFor();
  await pages[0].waitForFunction(expected => {
   const raw = localStorage.getItem('word-atlas:v3:activity:learner-default:primary-starter');
   return raw && Object.values(JSON.parse(raw).sessions).filter(s=>s.introduced.length>0).length === expected;
  }, same ? 1 : 2);
  const raw = await pages[0].evaluate(()=>localStorage.getItem('word-atlas:v3:activity:learner-default:primary-starter'));
  assert.equal(Object.values(JSON.parse(raw).sessions).filter(s=>s.introduced.length>0).length,same ? 1 : 2);
  await context.close();
 }
 console.log('英语相同主题冲突和不同主题并发保存通过');
} finally { await browser.close(); }
