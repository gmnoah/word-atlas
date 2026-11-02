import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const mode of ['lesson', 'co-read']) for (const fault of ['checkpoint', 'activity']) for (const width of [375, 1280]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 812 } });
    await context.addInitScript(theme => localStorage.setItem('word-atlas:settings', JSON.stringify({ theme, onboarded: true, splash: false })), theme);
    const prefix = fault === 'checkpoint' ? 'word-atlas:v3:hanzi-session:' : 'word-atlas:v3:activity:';
    await context.addInitScript(prefix => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith(prefix)) throw new DOMException('test quota', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    }, prefix);
    const page = await context.newPage();
    await page.goto('http://localhost:5188/#/explore?course=hanzi-starter&view=atlas');
    await page.locator('.hanzi-map-stop').first().getByRole('button', { name: mode === 'lesson' ? '认一认' : '只读一读', exact: true }).click();
    const label = mode === 'lesson' ? '认读' : '共读';
    const message = fault === 'checkpoint' ? `这次${label}暂时无法保存` : `已保留本次${label}记录`;
    await page.getByRole('alert').filter({ hasText: message }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (fault === 'activity') assert.equal(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('word-atlas:v3:hanzi-session:'))), true);
    await context.close();
  }
  console.log('汉字认读与共读保存故障提示及断点保留通过');
} finally { await browser.close(); }
