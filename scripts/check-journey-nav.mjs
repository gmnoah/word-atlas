import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true, channel: process.env.PREVIEW_BROWSER || "chrome"});
try {
 for (const width of [375, 1280]) for (const course of ['primary-starter','hanzi-starter']) {
  const context = await browser.newContext({viewport:{width,height:800}});
  await context.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new Error('simulated audio failure'));
    Object.defineProperty(window, 'speechSynthesis', { value: {getVoices: () => [], cancel: () => {}, addEventListener: () => {}, removeEventListener: () => {}} });
  });
  const page = await context.newPage();
  await page.goto('http://localhost:5188/#/explore');
  await page.locator(`[data-course-id="${course}"]`).getByRole('button',{name:'开始旅程'}).click();
  await page.getByRole('heading',{name:course === 'hanzi-starter' ? '一起看看生活里的字。' : '从一个小小的发现开始。'}).waitFor();
  await page.goto(`http://localhost:5188/#/explore?course=${course}`);
  await page.getByRole('button',{name:'今日旅程'}).click();
  await page.getByRole('heading',{name:course === 'hanzi-starter' ? '一起看看生活里的字。' : '从一个小小的发现开始。'}).waitFor();
  await page.getByRole('button',{name:'学习记录'}).click();
  await page.getByText('更早的逐日活动详情仍在完善。').waitFor();
  await page.goBack();
  await page.getByRole('heading',{name:course === 'hanzi-starter' ? '一起看看生活里的字。' : '从一个小小的发现开始。'}).waitFor();
  await page.goForward();
  await page.getByText('更早的逐日活动详情仍在完善。').waitFor();
  await page.reload();
  await page.getByText('更早的逐日活动详情仍在完善。').waitFor();
  await page.getByRole('button',{name:'主题图鉴'}).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await page.getByRole('button',{name:course === 'hanzi-starter' ? '查看山字卡' : '查看 apple 词卡'}).first().click();
  await page.getByRole('dialog',{name:'课程条目'}).getByRole('button',{name:'关闭'}).click();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),course === 'hanzi-starter' ? '查看山字卡' : '查看 apple 词卡');
  await page.getByRole('button',{name:'切换到浅色'}).click();
  await page.route('**/*.{webp,png,jpg}', route => route.abort());
  await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey&entry=${course === 'hanzi-starter' ? 'hanzi-u5c71' : 'en-apple'}`);
  const detail = page.getByRole('dialog',{name:'课程条目'});
  await detail.waitFor();
  await detail.getByRole('heading',{name:course === 'hanzi-starter' ? '山' : 'apple'}).waitFor();
  if (course === 'primary-starter') {
    await detail.getByText('我喜欢苹果。').waitFor();
    assert.equal(await detail.locator('mark').innerText(),'apples');
  } else {
    await detail.getByText('给家长的小提示').click();
    await detail.getByText('拼音：shān').waitFor();
  }
  await detail.locator('.plate').waitFor();
  await detail.getByRole('button',{name:course === 'hanzi-starter' ? '朗读 高山' : '朗读 apple'}).click();
  await detail.getByText('暂时无法播放，可以重试，也可以请家长读一读。').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await detail.getByRole('button',{name:'关闭'}).click();
  await page.getByRole('heading',{name:course === 'hanzi-starter' ? '一起看看生活里的字。' : '从一个小小的发现开始。'}).waitFor();
  await page.goto(`http://localhost:5188/#/explore?course=${course}&view=atlas&entry=missing-entry`);
  await page.getByRole('dialog',{name:'课程条目'}).getByText('课程中没有找到这个条目，请返回图鉴选择。').waitFor();
  await page.getByRole('dialog',{name:'课程条目'}).getByRole('button',{name:'关闭'}).click();
  await context.close();
 }
 console.log('课程导航：两门课程桌面与 375px、切换和刷新通过');
} finally { await browser.close(); }
