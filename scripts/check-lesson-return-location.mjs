import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const course of ['primary-starter', 'hanzi-starter']) for (const view of ['journey', 'atlas']) for (const width of [375, 1280]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    await context.addInitScript(theme => localStorage.setItem('word-atlas:settings', JSON.stringify({ theme, onboarded: true, splash: false })), theme);
    const page = await context.newPage();
    await page.goto(`http://localhost:5188/#/explore?course=${course}&view=${view}`);
    const isHanzi = course === 'hanzi-starter';
    if (view === 'journey') await page.locator('.journey-stop').first().getByRole('button', { name: isHanzi ? '一起读一读' : '开始小课' }).click();
    else await page.locator(isHanzi ? '.hanzi-map-stop' : '.preview-lesson-tile').first().getByRole('button', { name: isHanzi ? '只读一读' : '开始小课', exact: true }).click();
    await page.getByRole('button', { name: view === 'journey' ? '返回旅程' : '返回主题', exact: true }).click();
    await page.getByRole('button', { name: '结束本次学习' }).click();
    await page.getByRole('navigation', { name: '课程导航' }).getByRole('button', { name: view === 'journey' ? '今日旅程' : '主题图鉴' }).waitFor();
    assert.equal(await page.getByRole('navigation', { name: '课程导航' }).getByRole('button', { name: view === 'journey' ? '今日旅程' : '主题图鉴' }).getAttribute('aria-current'), 'page');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log('两课程从旅程和图鉴进入小课后的返回位置通过');
} finally { await browser.close(); }
