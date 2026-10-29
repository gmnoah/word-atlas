import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for(const width of [375,1280]) for(const theme of ['light','dark']) for(const reducedMotion of ['reduce','no-preference']) {
  const context=await browser.newContext({viewport:{width,height:850},reducedMotion,serviceWorkers:'block'});
  await context.addInitScript(theme=>localStorage.setItem('word-atlas:settings',JSON.stringify({onboarded:true,splash:false,theme})),theme);
  const page=await context.newPage(); await page.goto('http://localhost:5188/#/');
  const word=page.getByRole('button',{name:/打开今日一词 .+ 的词卡/}); await word.waitFor();
  const journeyWords=page.locator('.journey-words button');
  assert.ok(await journeyWords.count()>0,'首页应显示今天将遇见的单词');
  const item=journeyWords.first();
  if(reducedMotion==='reduce') assert.equal(await item.locator('..').evaluate(el=>getComputedStyle(el).animationName),'none');
  else assert.equal(await item.locator('..').evaluate(el=>getComputedStyle(el).animationName),'journey-word-arrive');
  await item.focus(); await page.keyboard.press('Enter'); await page.getByRole('dialog').waitFor();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  if(reducedMotion==='reduce') assert.equal(await word.evaluate(el=>getComputedStyle(el).animationName),'none');
  else assert.equal(await word.evaluate(el=>getComputedStyle(el).animationName),'wotd-reveal');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await word.focus(); await page.keyboard.press('Space'); await page.getByRole('dialog').waitFor();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  assert.equal(await page.getByRole('dialog').count(),0);
  await word.focus(); await page.keyboard.press('Enter'); await page.getByRole('dialog').waitFor();
  await context.close();
 }
 console.log('旅程单词与今日一词：桌面/375px、深浅色、减少动效及键盘词卡通过');
} finally {await browser.close();}
