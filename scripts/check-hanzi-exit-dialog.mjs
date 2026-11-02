import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const mode of ['认读', '共读']) for (const width of [375, 1280]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    await context.addInitScript(theme => localStorage.setItem('word-atlas:settings', JSON.stringify({ theme, onboarded: true, splash: false })), theme);
    const page = await context.newPage();
    await page.goto('http://localhost:5188/#/explore?course=hanzi-starter&view=atlas');
    await page.locator('.hanzi-map-stop').first().getByRole('button', { name: mode === '认读' ? '认一认' : '只读一读', exact: true }).click();
    await page.getByRole('button', { name: '返回主题' }).click();
    const sheet = page.getByRole('dialog', { name: `暂时结束${mode}` });
    await sheet.getByText('返回后，下次打开同一活动可以接着进行。学习记录保存在这台设备。').waitFor();
    await sheet.getByRole('button', { name: `继续这次${mode}` }).click();
    assert.equal(await sheet.isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log('认读与共读退出弹窗、继续操作及桌面/375px 深浅主题通过');
} finally { await browser.close(); }
