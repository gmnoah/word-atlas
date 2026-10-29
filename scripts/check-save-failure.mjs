/** Isolated storage faults: exit messages must match what was actually saved. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5188/';
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const [course, checkpointPrefix, progressPrefix] of [
    ['primary-starter', 'word-atlas:v3:primary-session:', 'word-atlas:v3:primary-progress:'],
    ['hanzi-starter', 'word-atlas:v3:hanzi-session:', 'word-atlas:v3:primary-progress:'],
  ]) {
    for (const fault of ['checkpoint', 'progress', 'activity']) {
      const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
      await context.addInitScript(({ prefix }) => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key.startsWith(prefix)) throw new DOMException('test quota', 'QuotaExceededError');
          return original.call(this, key, value);
        };
      }, { prefix: fault === 'checkpoint' ? checkpointPrefix : fault === 'activity' ? 'word-atlas:v3:activity:' : progressPrefix });
      const page = await context.newPage();
      await page.goto(`${base}#/explore?course=${course}`);
      if (course === 'primary-starter') await page.getByRole('button', { name: '开始小课', exact: true }).first().click();
      else await page.locator('.hanzi-map-stop').first().getByRole('button', { name: '认一认' }).click();
      if (fault === 'progress') await page.getByRole('button', { name: '认识了，继续' }).click();
      const alert = page.locator('.preview-study [role="alert"]');
      await alert.waitFor();
      await page.getByRole('button', { name: '返回主题' }).click();
      const sheet = page.getByRole('dialog');
      await sheet.waitFor({ state: 'visible' });
      await page.waitForFunction(() => {
        const el = document.querySelector('[role="dialog"]');
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
      });
      const rect = await sheet.boundingBox();
      const viewport = page.viewportSize();
      assert.ok(rect && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= viewport.width + 1 && rect.y + rect.height <= viewport.height + 1, 'the exit sheet must be within the viewport without scrolling');
      if (fault === 'checkpoint') {
        assert.match(await sheet.innerText(), /本次进度可能无法恢复/);
        assert.doesNotMatch(await sheet.innerText(), /下次打开同一.*接着进行/);
      } else {
        assert.match(await sheet.innerText(), /小课记录已保留/);
        const saved = await page.evaluate(prefix => Object.keys(localStorage).some(k => k.startsWith(prefix)), checkpointPrefix);
        assert.equal(saved, true, 'progress failure must retain the checkpoint');
      }
      if (fault === 'checkpoint') {
        await page.waitForFunction(() => document.activeElement?.closest('[role="dialog"]'));
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('Tab');
          assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), true);
        }
        await page.keyboard.press('Escape');
        assert.equal(await sheet.isVisible(), false);
        assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes('返回主题')), true);
        await page.getByRole('button', { name: '返回主题' }).click();
        await sheet.waitFor({ state: 'visible' });
        for (const size of [{ width: 375, height: 812 }, { width: 1440, height: 1000 }]) {
          await page.setViewportSize(size);
          for (const theme of ['light', 'dark']) {
            const nextTheme = theme === 'light' ? '切换到浅色' : '切换到深色';
            if (await page.getByRole('button', { name: nextTheme }).count()) {
              await sheet.getByRole('button', { name: '关闭' }).click();
              await page.getByRole('button', { name: nextTheme }).click();
              await page.getByRole('button', { name: '返回主题' }).click();
              await sheet.waitFor({ state: 'visible' });
              await page.waitForFunction(() => {
                const r = document.querySelector('[role="dialog"]').getBoundingClientRect();
                return r.top >= -1 && r.bottom <= innerHeight + 1;
              });
            }
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            await page.screenshot({ path: `output/preview-check/save-failure-${course}-${size.width}-${theme}.png`, animations: 'disabled' });
          }
        }
      }
      await page.getByRole('button', { name: '继续这次小课' }).or(page.getByRole('button', { name: '继续这次共读' })).click();
      assert.equal(await sheet.isVisible(), false);
      await context.close();
    }
  }
  console.log('Passed: both courses explain checkpoint and progress write failures without false resume promises.');
} finally { await browser.close(); }
