import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const course of ['primary-starter', 'hanzi-starter']) for (const width of [375, 1280]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    await context.addInitScript(({ course, theme }) => {
      localStorage.setItem('word-atlas:settings', JSON.stringify({ theme, onboarded: true, splash: false }));
      const now = new Date();
      const day = delta => { const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - delta, 12); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
      const answers = {}, answerDays = {};
      for (let i = 0; i < 30; i++) { const id = `test-${i}`; answers[id] = 'independent'; answerDays[id] = day(i < 10 ? 1 : 0); }
      const record = { version: 1, profileId: 'learner-default', courseId: course, since: Date.now() - 172800000, sessions: { test: { sessionId: 'test', contentVersion: 'test', mode: 'lesson', startedAt: 1, updatedAt: 2, introduced: [], answers, answerDays } } };
      localStorage.setItem(`word-atlas:v3:activity:learner-default:${course}`, JSON.stringify(record));
    }, { course, theme });
    const page = await context.newPage();
    await page.goto(`http://localhost:5188/#/explore?course=${course}&view=records`);
    const rows = page.locator('.activity-week li');
    await rows.last().getByText(/识别 20 次/).waitFor();
    await rows.nth(5).getByText(/识别 10 次/).waitFor();
    assert.equal(await rows.nth(5).locator('i').evaluate(el => el.style.width), '50%');
    assert.equal(await rows.last().locator('i').evaluate(el => el.style.width), '100%');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log('两课程七天图表按最大次数同比例显示通过');
} finally { await browser.close(); }
