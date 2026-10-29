import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for (const course of ['primary-starter','hanzi-starter']) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:5188/#/explore');
  await page.locator(`[data-course-id="${course}"]`).getByRole('button',{name:'开始旅程'}).click();
  if (course === 'primary-starter') await page.getByRole('button',{name:'开始今日小课'}).click();
  else await page.getByRole('button',{name:'一起读一读',exact:true}).first().click();
  await page.getByRole('button',{name:course === 'primary-starter' ? '认识了，继续' : '看过啦，下一个'}).click();
  const prefix = course === 'primary-starter' ? 'word-atlas:v3:primary-session:' : 'word-atlas:v3:hanzi-session:';
  await page.waitForFunction(prefix => Object.keys(localStorage).some(key => key.startsWith(prefix) && JSON.parse(localStorage.getItem(key)).session.introduced.length > 0), prefix);
  await page.goBack();
  await page.locator(`[data-course-id="${course}"]`).getByRole('button',{name:'开始旅程'}).click();
  const resume = page.getByRole('button',{name:course === 'primary-starter' ? '继续今日小课' : /继续共读/});
  await resume.waitFor();
  await resume.click();
  assert.equal(await page.getByRole('button',{name:'返回主题'}).isVisible(),true);
  await context.close();
 }
 console.log('浏览器返回后两课程可恢复小课');
} finally { await browser.close(); }
