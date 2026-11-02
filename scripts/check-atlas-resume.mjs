import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const course of ['primary-starter', 'hanzi-starter']) for (const width of [375, 1280]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    await context.addInitScript(theme => localStorage.setItem('word-atlas:settings', JSON.stringify({ theme, onboarded: true, splash: false })), theme);
    const page = await context.newPage();
    await page.goto(`http://localhost:5188/#/explore?course=${course}&view=atlas`);
    const isHanzi = course === 'hanzi-starter';
    const card = page.locator(isHanzi ? '.hanzi-map-stop' : '.preview-lesson-tile').first();
    await card.getByRole('button', { name: isHanzi ? '只读一读' : '开始小课', exact: true }).click();
    await page.getByRole('button', { name: isHanzi ? '看过啦，下一个' : '认识了，继续' }).click();
    await page.getByRole('button', { name: '返回主题' }).click();
    await page.getByRole('button', { name: '结束体验' }).click();
    await card.getByRole('button', { name: isHanzi ? '继续共读' : '继续小课', exact: true }).waitFor();
    if (!isHanzi) assert.equal(await card.getByText('从哪个词开始').count(), 0);
    if (isHanzi) assert.equal(await card.getByRole('button', { name: '认一认', exact: true }).isEnabled(), true);
    const prefix = isHanzi ? 'word-atlas:v3:hanzi-session:' : 'word-atlas:v3:primary-session:';
    const key = await page.evaluate(prefix => Object.keys(localStorage).find(k => k.startsWith(prefix)), prefix);
    assert.ok(key);
    await page.evaluate(key => localStorage.setItem(key, 'broken'), key);
    await page.reload();
    await card.getByText(/记录暂时无法读取，原记录已保留/).waitFor();
    assert.equal(await card.getByRole('button', { name: isHanzi ? '只读一读' : '开始小课', exact: true }).isDisabled(), true);
    if (isHanzi) assert.equal(await card.getByRole('button', { name: '认一认', exact: true }).isEnabled(), true);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), 'broken');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log('图鉴续学标签、独立活动与损坏记录保护通过');
} finally { await browser.close(); }
