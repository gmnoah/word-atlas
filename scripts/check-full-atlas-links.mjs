import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for(const course of ['primary-starter','hanzi-starter']){
  const context=await browser.newContext({viewport:{width:375,height:812}});
  const page=await context.newPage();
  await page.goto(`http://localhost:5188/#/explore?course=${course}&view=atlas`);
  const selector=course==='primary-starter' ? '.preview-entry-link' : '.hanzi-entry-link';
  const entries=page.locator(selector);
  await entries.first().waitFor();
  assert.equal(await entries.count(),300);
  await entries.last().click();
  await page.getByRole('dialog',{name:'课程条目'}).waitFor();
  await page.getByRole('dialog',{name:'课程条目'}).getByRole('button',{name:'关闭'}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.close();
 }
 console.log('两课程图鉴各 300 条均有详情入口，最后一条可打开');
} finally {await browser.close();}
