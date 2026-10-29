import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for (const course of ['primary-starter','hanzi-starter']) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://localhost:5188/#/explore?course=${course}`);
  if (course === 'primary-starter') await page.getByRole('button',{name:'开始小课',exact:true}).first().click();
  else await page.locator('.hanzi-map-stop').first().getByRole('button',{name:'只读一读'}).click();
  await page.getByRole('button',{name:'先跳过，下次再认识'}).click();
  await page.getByRole('button',{name:'返回主题'}).click();
  await page.getByRole('button',{name:'结束体验'}).click();
  await page.getByRole('button',{name:'学习记录'}).click();
  await page.getByText('已记录：初见先跳过 1 次 · 识别题先跳过 0 次 · 识别题资源暂不可用 0 次').waitFor();
  await page.reload();
  await page.getByText('已记录：初见先跳过 1 次 · 识别题先跳过 0 次 · 识别题资源暂不可用 0 次').waitFor();
  const record = await page.evaluate(course => JSON.parse(localStorage.getItem(`word-atlas:v3:activity:learner-default:${course}`)), course);
  assert.equal(Object.values(record.sessions).reduce((n,s)=>n+(s.introSkipped?.length ?? 0),0),1);
  await context.close();
 }
 console.log('两课程初见跳过、保存和刷新通过');
} finally { await browser.close(); }
