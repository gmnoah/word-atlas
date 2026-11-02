import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const course of ['primary-starter', 'hanzi-starter']) for (const width of [375, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    await context.addInitScript(() => {
      Date.now = () => 1003;
      Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [], cancel: () => {}, addEventListener: () => {}, removeEventListener: () => {} } });
      localStorage.setItem('word-atlas:settings', JSON.stringify({ onboarded: true, splash: false }));
    });
    const page = await context.newPage();
    const hanzi = course === 'hanzi-starter';
    await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
    if (hanzi) await page.getByRole('button', { name: '试试认一认' }).click();
    else await page.locator('.journey-stop').first().getByRole('button', { name: '开始小课' }).click();
    let answered = 0;
    for (let i = 0; i < 30 && !await page.locator('.preview-finish').isVisible(); i++) {
      const intro = page.getByRole('button', { name: '认识了，继续' });
      if (await intro.isVisible()) { await intro.click(); continue; }
      const card = page.locator('.preview-study-card.is-recall');
      await card.waitFor();
      const kind = await card.getAttribute('data-question-kind');
      if (kind?.startsWith('listen-')) {
        await page.getByRole('button', { name: '播放题目发音' }).click();
        await page.waitForFunction(() => !document.querySelector('.preview-option')?.disabled);
      }
      assert.notEqual(kind, 'hanzi-listen', 'test context has no Mandarin voice');
      const target = await card.getAttribute('data-content-id');
      await page.locator(`[data-option-id="${target}"]`).click();
      await page.getByRole('button', { name: '继续', exact: true }).click();
      answered++;
    }
    assert.ok(answered > 0, '小课至少完成一道题');
    const finish = page.locator('.preview-finish');
    await finish.waitFor();
    await finish.getByRole('button', { name: '回到旅程' }).click();
    await page.getByRole('button', { name: '学习记录', exact: true }).click();
    const record = page.getByRole('region', { name: '详细活动记录' });
    await record.waitFor();
    const raw = await page.evaluate(course => localStorage.getItem(`word-atlas:v3:activity:learner-default:${course}`), course);
    const activity = JSON.parse(raw);
    assert.ok(Object.values(activity.sessions).some(session => Object.keys(session.answers).length > 0));
    const independent = Object.values(activity.sessions).flatMap(session => Object.values(session.answers)).filter(answer => answer === 'independent').length;
    assert.match(await record.getByRole('list', { name: '首次答对分类' }).getByRole('listitem').first().innerText(), new RegExp(`独立答对\\s*${independent}\\s*次`));
    await page.reload();
    await page.getByRole('region', { name: '详细活动记录' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log('英语与汉字正常答题、完成、返回及记录刷新通过');
} finally { await browser.close(); }
