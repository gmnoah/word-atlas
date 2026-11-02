import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const course of ['primary-starter', 'hanzi-starter']) for (const method of ['skip', 'timeout']) for (const width of [375, 1280]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    await context.addInitScript(theme => localStorage.setItem('word-atlas:settings', JSON.stringify({ theme, onboarded: true, splash: true })), theme);
    const page = await context.newPage();
    await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
    const skip = page.getByRole('button', { name: '跳过开场' });
    await skip.waitFor();
    await skip.focus();
    if (method === 'skip') await page.keyboard.press('Enter');
    await skip.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest('.journey-actions')), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log('两课程开场跳过与自动结束的焦点恢复通过');
} finally { await browser.close(); }
