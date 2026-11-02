import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const [course, mode] of [['primary-starter', 'lesson'], ['hanzi-starter', 'co-read'], ['hanzi-starter', 'lesson']]) for (const width of [375, 1280]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    await context.addInitScript(theme => localStorage.setItem('word-atlas:settings', JSON.stringify({ theme, onboarded: true, splash: false })), theme);
    const page = await context.newPage();
    await page.goto(`http://localhost:5188/#/explore?course=${course}&view=atlas`);
    const hanzi = course === 'hanzi-starter';
    await page.locator(hanzi ? '.hanzi-map-stop' : '.preview-lesson-tile').first().getByRole('button', { name: hanzi ? mode === 'co-read' ? '只读一读' : '认一认' : '开始小课', exact: true }).click();
    for (let i = 0; i < 20 && !await page.locator('.preview-finish').isVisible(); i++) await page.getByRole('button', { name: '先跳过，下次再认识' }).click();
    const finish = page.locator('.preview-finish');
    await finish.getByRole('heading', { name: '这次先到这里。' }).waitFor();
    assert.equal(await finish.locator('.hanzi-life-tip').count(), 0);
    assert.match(await finish.locator('.mini-stats div').first().innerText(), /0/);
    await finish.getByRole('button', { name: '回到主题' }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log('两课程全部跳过后的结束提示和返回通过');
} finally { await browser.close(); }
