import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true, channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for (const width of [375, 1280]) for (const course of ['primary-starter', 'hanzi-starter']) {
  const context = await browser.newContext({viewport:{width,height:800}});
  const page = await context.newPage();
  await page.goto(`http://localhost:5188/#/explore?course=${course}&view=records`);
  await page.getByText('更早的逐日活动详情仍在完善。').waitFor();
  await page.evaluate(courseId => {
   const record = {version:1,profileId:'learner-default',courseId,since:Date.now(),sessions:{s:{sessionId:'s',contentVersion:'1',mode:'lesson',startedAt:1,updatedAt:2,introduced:['a'],answers:{a:'independent',b:'hinted',c:'assisted',d:'skipped',e:'resource-error'},retryEvents:{'retry-0':'skipped','retry-1':'resource-error'}}}};
   localStorage.setItem(`word-atlas:v3:activity:learner-default:${courseId}`, JSON.stringify(record));
  },course);
  await page.reload();
  await page.getByText('独立答对 1 次 · 提示后答对 1 次 · 家长一起答对 1 次').waitFor();
  await page.getByText('已记录：初见先跳过 0 次 · 识别题先跳过 1 次 · 识别题资源暂不可用 1 次').waitFor();
  await page.getByText('已记录：重试时跳过 1 次 · 重试时资源暂不可用 1 次').waitFor();
  await page.getByText('部分早期会话未保存初见跳过详情，上述次数仅包含已有记录。').waitFor();
  assert.equal(await page.locator('.activity-week li').count(),7);
  await page.getByText('查看主题足迹').click();
  assert.ok(await page.locator('.course-theme-records li').count() > 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await page.getByRole('button',{name:'切换到浅色'}).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await page.evaluate(courseId => {
   const archived={sessionId:'old',contentVersions:['1'],mode:'lesson',endedAt:2,totals:{independent:1,hinted:0,assisted:0,incorrect:0,skipped:0,resourceErrors:0,introSkipped:0,retrySkipped:0,retryResourceErrors:0,coReadSessions:0},recognitionByDay:{'2020-01-01':1},coReadDays:[],introHistoryKnown:false,retryHistoryKnown:false};
   localStorage.setItem(`word-atlas:v3:activity:learner-default:${courseId}`,JSON.stringify({version:1,profileId:'learner-default',courseId,since:1,sessions:{},archivedSessions:{old:archived}}));
  },course);
  await page.reload();
  await page.getByText('独立答对 1 次 · 提示后答对 0 次 · 家长一起答对 0 次').waitFor();
  await page.getByText('部分早期会话未保存初见跳过和重试详情，上述次数仅包含已有记录。').waitFor();
  assert.equal(await page.getByText('部分较长会话的重试记录不完整，以上重试次数仅包含已保存的记录。').count(),0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await page.evaluate(courseId => localStorage.setItem(`word-atlas:v3:activity:learner-default:${courseId}`, '{bad'), course);
  await page.reload();
  await page.getByText('详细记录暂时无法读取，原记录已保留。').waitFor();
  assert.equal(await page.evaluate(courseId => localStorage.getItem(`word-atlas:v3:activity:learner-default:${courseId}`), course), '{bad');
  await context.close();
 }
 console.log('活动记录：两门课程模拟数据、桌面及 375px 双主题通过');
} finally { await browser.close(); }
