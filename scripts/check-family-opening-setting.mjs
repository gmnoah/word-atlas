import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for(const width of [375,1280]) for(const theme of ['light','dark']) for(const initial of ['primary-starter','hanzi-starter']) {
  const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'});
  await context.addInitScript(theme=>{if(!localStorage.getItem('word-atlas:settings'))localStorage.setItem('word-atlas:settings',JSON.stringify({theme,onboarded:true,splash:false}));},theme);
  const page=await context.newPage(), other=initial==='primary-starter'?'hanzi-starter':'primary-starter';
  await page.goto(`http://localhost:5188/#/explore?course=${initial}&view=journey`);
  assert.equal(await page.getByRole('button',{name:'跳过开场'}).count(),0);
  await page.getByRole('button',{name:'家长设置'}).click();
  const sheet=page.getByRole('dialog',{name:'家长设置'}), toggle=sheet.getByLabel('显示旅程开场动画');
  await toggle.check(); await page.waitForFunction(()=>JSON.parse(localStorage.getItem('word-atlas:settings')).splash===true);
  await sheet.getByRole('button',{name:'设置好了'}).click();
  await page.goto(`http://localhost:5188/#/explore?course=${other}&view=journey`);
  const skip=page.getByRole('button',{name:'跳过开场'}); await skip.waitFor(); await skip.click();
  await page.getByRole('button',{name:'家长设置'}).click();
  await page.getByRole('dialog',{name:'家长设置'}).getByLabel('显示旅程开场动画').uncheck();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('word-atlas:settings')).splash===false);
  await page.getByRole('dialog',{name:'家长设置'}).getByRole('button',{name:'设置好了'}).click();
  await page.reload(); await page.locator('.preview-hero').waitFor();
  assert.equal(await page.getByRole('button',{name:'跳过开场'}).count(),0);
  await page.getByRole('button',{name:'家长设置'}).click();
  assert.equal(await page.getByRole('dialog',{name:'家长设置'}).getByLabel('显示旅程开场动画').isChecked(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.close();
 }
 console.log('两课程家长设置开场开关、跨课程持久化及桌面/375px 双主题通过');
} finally {await browser.close();}
