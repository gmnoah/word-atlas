import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for (const course of ['primary-starter','hanzi-starter']) for (const width of [375,1280]) for (const reducedMotion of ['reduce','no-preference']) {
  const context=await browser.newContext({viewport:{width,height:800},reducedMotion});
  const page=await context.newPage();
  await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
  const card=page.locator('.journey-stop').first();
  await card.waitFor();
  assert.equal(await card.getAttribute('data-state'),'new');
  const progress=card.getByRole('progressbar');
  assert.equal(await progress.getAttribute('value'),'0');
  assert.match(await progress.getAttribute('aria-label'),/看过 0 \/ \d+ 个[词字]/);
  assert.ok(await card.getByRole('button',{name:course === 'hanzi-starter' ? '一起读一读' : '开始小课'}).evaluate(el=>el.getBoundingClientRect().height)>=48);
  await card.getByRole('button',{name:course === 'hanzi-starter' ? '一起读一读' : '开始小课'}).click();
  await page.getByRole('button',{name:course === 'hanzi-starter' ? '看过啦，下一个' : '认识了，继续'}).click();
  await page.getByRole('button',{name:'返回主题'}).click();
  await page.getByRole('button',{name:'结束体验'}).click();
  const visited=page.locator('.journey-stop[data-state=partial]').first();
  await visited.waitFor();
  assert.equal(await visited.getByRole('progressbar').getAttribute('value'),'1');
  assert.match(await visited.getByText(/看过 1 \/ \d+ 个[词字]/).innerText(),/看过 1/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(reducedMotion==='reduce') assert.ok(await card.evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration)) <= 0.001);
  await page.getByRole('button',{name:'切换到浅色'}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.close();
 }
 console.log('两课程学习后旅程状态、减少动态及桌面/375px 双主题通过');
} finally {await browser.close();}
