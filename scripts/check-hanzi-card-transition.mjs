import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const width of [375, 1280]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    await context.addInitScript(theme => {
      localStorage.setItem('word-atlas:settings', JSON.stringify({ theme, onboarded: true, splash: false }));
      window.__voiceCancels = 0;
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      Object.defineProperty(window, 'speechSynthesis', { value: {
        getVoices: () => [{ lang: 'zh-CN', name: 'test' }],
        cancel: () => { window.__voiceCancels++; }, speak: () => {}, addEventListener: () => {}, removeEventListener: () => {},
      } });
    }, theme);
    const page = await context.newPage();
    await page.goto('http://localhost:5188/#/explore?course=hanzi-starter&view=atlas');
    await page.locator('.hanzi-map-stop').first().getByRole('button', { name: '只读一读' }).click();
    const noteSummary = page.locator('.hanzi-card-note summary');
    assert.equal(await noteSummary.locator('svg').count(), 1);
    assert.ok(await noteSummary.evaluate(element => element.getBoundingClientRect().height >= 48));
    await noteSummary.click();
    assert.equal(await page.locator('.hanzi-card-note').getAttribute('open'), '');
    await page.getByRole('button', { name: '朗读词语 高山' }).click();
    await page.getByRole('button', { name: '停止朗读' }).waitFor();
    const before = await page.evaluate(() => window.__voiceCancels);
    await page.getByRole('button', { name: '看过啦，下一个' }).click();
    await page.getByRole('button', { name: '朗读词语 清水' }).waitFor();
    assert.equal(await page.locator('.hanzi-card-note').getAttribute('open'), null);
    assert.equal(await page.getByRole('button', { name: '停止朗读' }).count(), 0);
    assert.ok(await page.evaluate(() => window.__voiceCancels) > before);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log('汉字字卡切换停止旧朗读并重置家长提示通过');
} finally { await browser.close(); }
