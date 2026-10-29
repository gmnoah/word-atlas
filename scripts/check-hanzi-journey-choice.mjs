import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for(const width of [375,1280]) for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'});
  await context.addInitScript(theme=>localStorage.setItem('word-atlas:settings',JSON.stringify({theme,onboarded:true,splash:false})),theme);
  const page=await context.newPage(); await page.goto('http://localhost:5188/#/explore?course=hanzi-starter&view=journey');
  const hero=page.locator('.preview-hero');
  const reading=hero.getByRole('button',{name:'一起读一读'}), recognize=hero.getByRole('button',{name:'试试认一认'});
  await reading.waitFor(); await recognize.waitFor();
  assert.ok(await recognize.evaluate(el=>el.getBoundingClientRect().height)>=48);
  await recognize.click();
  await page.getByRole('button',{name:'认识了，继续'}).waitFor();
  await page.waitForFunction(()=>Object.keys(localStorage).some(k=>k.startsWith('word-atlas:v3:hanzi-session:')));
  const mode=await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('word-atlas:v3:hanzi-session:'));return k?.split(':').at(-1);});
  assert.equal(mode,'lesson');
  await page.getByRole('button',{name:'认识了，继续'}).click();
  await page.getByRole('button',{name:'返回主题'}).click(); await page.getByRole('button',{name:'结束体验'}).click();
  await hero.getByRole('button',{name:/继续认一认：/}).waitFor();
  assert.equal(await hero.getByRole('button',{name:/继续认一认：/}).count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.close();
 }
 console.log('汉字旅程共读优先、认一认入口与续学通过');
} finally {await browser.close();}
