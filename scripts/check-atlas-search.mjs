import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  for (const width of [375, 1280]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: 'block' });
    await context.addInitScript(theme => localStorage.setItem('word-atlas:settings', JSON.stringify({ theme, onboarded: true, splash: false })), theme);
    const page = await context.newPage();
    await page.goto('http://localhost:5188/#/explore?course=primary-starter&view=atlas');
    const english = page.getByRole('searchbox', { name: '查找主题或单词' });
    await page.getByText('全部 33 个主题 · 300 个词，按主题保留完整图鉴。').waitFor();
    const firstTheme = page.locator('.preview-lesson-tile').first();
    for (const control of [firstTheme.getByRole('button', { name: '查看 apple 词卡' }), firstTheme.getByRole('button', { name: '开始小课' }), firstTheme.getByLabel('水果篮子起始词')]) {
      const box = await control.boundingBox();
      assert.ok(box && box.width >= 48 && box.height >= 48, '儿童图鉴核心操作至少 48px');
    }
    await english.fill('ELEPHANT');
    await page.getByRole('heading', { name: '英语词汇 03' }).waitFor();
    await page.getByText(/显示 1 \/ 33 个匹配主题 · 1 \/ 300 个词。主题内未匹配的内容仍会显示。/).waitFor();
    const clearEnglish = page.getByRole('button', { name: '清空图鉴查找' });
    assert.equal(await clearEnglish.evaluate((element) => element.getBoundingClientRect().width >= 48 && element.getBoundingClientRect().height >= 48), true);
    await page.getByRole('button', { name: '查看 elephant 词卡，符合查找' }).click();
    await page.getByRole('heading', { name: 'elephant', exact: true }).waitFor();
    await page.getByRole('button', { name: '关闭' }).click();
    await english.fill('没有这个词xyz');
    await page.getByText('没有找到相关主题。换一个单词或中文，清空查找可恢复全部 33 个主题、300 个词。').waitFor();
    await english.fill('');
    await page.getByText('全部 33 个主题 · 300 个词，按主题保留完整图鉴。').waitFor();
    await page.goto('http://localhost:5188/#/explore?course=hanzi-starter&view=atlas');
    const hanzi = page.getByRole('searchbox', { name: '查找主题或汉字' });
    await page.getByText('全部 32 个主题 · 300 个字，按主题保留完整图鉴。').waitFor();
    await hanzi.fill('shan');
    await page.getByRole('heading', { name: '山水之间' }).waitFor();
    await page.getByText(/个匹配主题 · [1-9]\d* \/ 300 个字。主题内未匹配的内容仍会显示。/).waitFor();
    await page.getByRole('button', { name: '查看山字卡，符合查找' }).waitFor();
    await hanzi.fill('shān');
    await page.getByRole('button', { name: '查看山字卡，符合查找' }).waitFor();
    await hanzi.fill('苹果');
    await page.getByRole('heading', { name: '水果和点心' }).waitFor();
    await page.getByRole('button', { name: '查看苹字卡，符合查找' }).click();
    await page.getByRole('heading', { name: '苹', exact: true }).waitFor();
    await page.getByRole('button', { name: '关闭' }).click();
    await page.getByRole('button', { name: '清空图鉴查找' }).click();
    await page.getByText('全部 32 个主题 · 300 个字，按主题保留完整图鉴。').waitFor();
    assert.equal(await hanzi.inputValue(), '');
    assert.equal(await hanzi.evaluate((element) => document.activeElement === element), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log('两课程全量图鉴摘要、搜索计数、空结果、清除按钮、词字卡及桌面/375px 深浅主题通过');
} finally { await browser.close(); }
