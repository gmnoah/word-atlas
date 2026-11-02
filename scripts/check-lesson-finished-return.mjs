import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const [course, mode] of [['primary-starter', 'lesson'], ['hanzi-starter', 'co-read'], ['hanzi-starter', 'lesson']]) for (const view of ['journey', 'atlas']) for (const width of [375, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('word-atlas:settings', JSON.stringify({ onboarded: true, splash: false })));
    const page = await context.newPage();
    await page.goto(`http://localhost:5188/#/explore?course=${course}&view=${view}`);
    const isHanzi = course === 'hanzi-starter';
    if (view === 'journey' && isHanzi && mode === 'lesson') await page.getByRole('button', { name: '试试认一认' }).click();
    else if (view === 'journey') await page.locator('.journey-stop').first().getByRole('button', { name: isHanzi ? '一起读一读' : '开始小课' }).click();
    else await page.locator(isHanzi ? '.hanzi-map-stop' : '.preview-lesson-tile').first().getByRole('button', { name: isHanzi ? mode === 'co-read' ? '只读一读' : '认一认' : '开始小课', exact: true }).click();
    for (let i = 0; i < 20 && !await page.locator('.preview-finish').isVisible(); i++) {
      const intro = page.getByRole('button', { name: isHanzi && mode === 'co-read' ? '看过啦，下一个' : '认识了，继续' });
      if (await intro.isVisible()) await intro.click();
      else await page.getByRole('button', { name: '先跳过，下次再认识' }).click();
    }
    const finish = page.locator('.preview-finish');
    await finish.waitFor();
    await finish.getByRole('button', { name: view === 'journey' ? '回到旅程' : '回到主题', exact: true }).click();
    const nav = page.getByRole('navigation', { name: '课程导航' });
    const current = nav.getByRole('button', { name: view === 'journey' ? '今日旅程' : '主题图鉴' });
    await current.waitFor();
    assert.equal(await current.getAttribute('aria-current'), 'page');
    await context.close();
  }
  console.log('两课程小课结束页返回旅程或主题通过');
} finally { await browser.close(); }
