import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for (const course of ['primary-starter','hanzi-starter']) for (const width of [375,1280]) for (const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'});
  await context.addInitScript(theme=>localStorage.setItem('word-atlas:settings',JSON.stringify({theme,onboarded:true,splash:false})),theme);
  const page=await context.newPage();
  await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
  let card=page.locator('.journey-stop').first(); await card.waitFor();
  const title=await card.locator('h3').innerText();
  await card.getByRole('button',{name:course==='primary-starter'?'开始小课':'一起读一读'}).click();
  await page.getByRole('button',{name:course==='primary-starter'?'认识了，继续':'看过啦，下一个'}).click();
  await page.getByRole('button',{name:'返回主题'}).click();
  await page.getByRole('button',{name:'结束体验'}).click();
  card=page.locator('.journey-stop').filter({has:page.getByRole('heading',{name:title,exact:true})});
  await card.getByRole('button',{name:course==='primary-starter'?'继续小课':'继续共读'}).waitFor();
  const prefix=course==='primary-starter'?'word-atlas:v3:primary-session:':'word-atlas:v3:hanzi-session:';
  await page.evaluate(prefix=>{const key=Object.keys(localStorage).find(k=>k.startsWith(prefix));localStorage.setItem(key,'broken');},prefix);
  await page.reload();
  card=page.locator('.journey-stop').filter({has:page.getByRole('heading',{name:title,exact:true})});
  await card.getByText('这次小课记录暂时无法读取，原记录已保留。可以选择其他主题。').waitFor();
  assert.equal(await card.locator('button').isDisabled(),true);
  if(course==='hanzi-starter') {
   await page.locator('.preview-hero').getByRole('button',{name:'一起读一读'}).click();
   await page.getByRole('heading',{name:'一个字，一个小发现'}).waitFor();
   assert.equal(await page.getByText('这次共读暂时无法保存：本地记录不可用或已在其他页面更改。原有记录会保留。').count(),0);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.close();
 }
 console.log('两课程旅程断点标签、损坏记录保护及汉字安全回退通过');
} finally {await browser.close();}
