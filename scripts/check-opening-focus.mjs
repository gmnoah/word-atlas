import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const course of ['primary-starter', 'hanzi-starter']) for (const method of ['skip', 'timeout']) for (const width of [375, 1280]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    await context.addInitScript(theme => localStorage.setItem('word-atlas:settings', JSON.stringify({ theme, onboarded: true, splash: true })), theme);
    const page = await context.newPage();
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
    const skip = page.getByRole('button', { name: '跳过开场' });
    await skip.waitFor();
    await page.locator('.course-opening-orbit').waitFor();
    assert.match(await page.locator('.course-opening-kicker').innerText(), course === 'hanzi-starter' ? /亲子探索/ : /今日探索/);
    await skip.focus();
    if (method === 'skip') await page.keyboard.press('Enter');
    await skip.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest('.journey-actions')), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(failures, []);
    await context.close();
  }
  for (const course of ['primary-starter', 'hanzi-starter']) {
    const context = await browser.newContext({ viewport: { width: 375, height: 850 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('word-atlas:settings', JSON.stringify({ theme: 'dark', onboarded: true, splash: true })));
    const page = await context.newPage();
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
    await page.locator('.journey-actions').waitFor();
    assert.equal(await page.getByRole('button', { name: '跳过开场' }).isVisible(), false);
    assert.equal(await page.locator('.course-opening').isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(failures, []);
    await context.close();
  }
  console.log('两课程开场跳过、自动结束、焦点恢复与减少动效通过');
} finally { await browser.close(); }
