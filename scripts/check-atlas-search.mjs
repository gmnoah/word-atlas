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
    await english.fill('ELEPHANT');
    await page.getByRole('heading', { name: '英语词汇 03' }).waitFor();
    await page.getByRole('button', { name: '查看 elephant 词卡，符合查找' }).click();
    await page.getByRole('heading', { name: 'elephant', exact: true }).waitFor();
    await page.getByRole('button', { name: '关闭' }).click();
    await english.fill('没有这个词xyz');
    await page.getByText('没有找到相关主题，试试其他词。').waitFor();
    await english.fill('');
    await page.getByRole('heading', { name: '水果篮子' }).waitFor();
    await page.goto('http://localhost:5188/#/explore?course=hanzi-starter&view=atlas');
    const hanzi = page.getByRole('searchbox', { name: '查找主题或汉字' });
    await hanzi.fill('苹果');
    await page.getByRole('heading', { name: '水果和点心' }).waitFor();
    await page.getByRole('button', { name: '查看苹字卡，符合查找' }).click();
    await page.getByRole('heading', { name: '苹', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log('两课程图鉴搜索、词字卡、空结果、清除及桌面/375px 深浅主题通过');
} finally { await browser.close(); }
