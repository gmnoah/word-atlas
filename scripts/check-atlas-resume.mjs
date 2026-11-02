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
    await page.getByRole('button', { name: '结束本次学习' }).click();
    await card.getByRole('button', { name: isHanzi ? '继续共读' : '继续小课', exact: true }).waitFor();
    if (!isHanzi) assert.equal(await card.getByText('从哪个词开始').count(), 0);
    if (isHanzi) assert.equal(await card.getByRole('button', { name: '认一认', exact: true }).isEnabled(), true);
    const prefix = isHanzi ? 'word-atlas:v3:hanzi-session:' : 'word-atlas:v3:primary-session:';
    const key = await page.evaluate(prefix => Object.keys(localStorage).find(k => k.startsWith(prefix)), prefix);
    assert.ok(key);
    await page.evaluate(({ key, isHanzi }) => {
      localStorage.setItem(key, 'broken');
      if (isHanzi) localStorage.setItem(key.replace(/:co-read$/, ':lesson'), 'broken');
    }, { key, isHanzi });
    await page.reload();
    await card.getByText(/记录暂时无法读取，原记录已保留/).waitFor();
    assert.equal(await card.getByRole('button', { name: isHanzi ? '只读一读' : '开始小课', exact: true }).count(), 0);
    if (isHanzi) {
      assert.equal(await card.getByRole('button', { name: '共读记录待恢复', exact: true }).isDisabled(), true);
      assert.equal(await card.getByRole('button', { name: '认读记录待恢复', exact: true }).isDisabled(), true);
    } else {
      assert.equal(await card.getByRole('button', { name: '小课记录待恢复', exact: true }).isDisabled(), true);
    }
    const recovery = card.getByRole('button', { name: '打开家长设置' });
    await recovery.waitFor();
    assert.equal(await recovery.evaluate(element => element.getBoundingClientRect().height >= 48), true);
    await recovery.click();
    await page.getByRole('dialog').getByText('备份与恢复').waitFor();
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    assert.equal(await page.evaluate(({ key, isHanzi }) => localStorage.getItem(key) === 'broken'
      && (!isHanzi || localStorage.getItem(key.replace(/:co-read$/, ':lesson')) === 'broken'), { key, isHanzi }), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
    const brokenStop = page.locator('.journey-stop').filter({ hasText: '这次小课记录暂时无法读取' }).first();
    await brokenStop.waitFor();
    const journeyRecovery = brokenStop.getByRole('button', { name: '打开家长设置' });
    assert.equal(await journeyRecovery.evaluate(element => element.getBoundingClientRect().height >= 48), true);
    await journeyRecovery.click();
    await page.getByRole('dialog').getByText('备份与恢复').waitFor();
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    assert.equal(await journeyRecovery.evaluate(element => document.activeElement === element), true);
    assert.equal(await page.evaluate(({ key, isHanzi }) => localStorage.getItem(key) === 'broken'
      && (!isHanzi || localStorage.getItem(key.replace(/:co-read$/, ':lesson')) === 'broken'), { key, isHanzi }), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log('图鉴与旅程续学标签、恢复入口和损坏记录保护通过');
} finally { await browser.close(); }
