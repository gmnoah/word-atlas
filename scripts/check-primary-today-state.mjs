import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for(const width of [375,1280]) for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'});
  await context.addInitScript(theme=>localStorage.setItem('word-atlas:settings',JSON.stringify({theme,onboarded:true,splash:false})),theme);
  const page=await context.newPage(); await page.goto('http://localhost:5188/#/explore?course=primary-starter&view=journey');
  const panel=page.locator('.primary-journey');
  const hero=page.locator('.preview-hero');
  const start=hero.getByRole('button',{name:'开始今日小课'}); await start.waitFor();
  assert.ok(await start.evaluate(el=>el.getBoundingClientRect().height)>=48);
  await start.click(); await page.getByRole('button',{name:'认识了，继续'}).click();
  await page.getByRole('button',{name:'返回主题'}).click(); await page.getByRole('button',{name:'结束体验'}).click();
  await hero.getByRole('button',{name:'继续今日小课'}).waitFor();
  await panel.getByText('上次的小课还在这里，随时接着学习。').waitFor();
  const key='word-atlas:v3:primary-session:learner-default:primary-starter:today';
  await page.evaluate(key=>{const c=JSON.parse(localStorage.getItem(key));c.session.index=c.session.steps.length;c.session.endedAt=Date.now();c.session.endReason='completed';localStorage.setItem(key,JSON.stringify(c));},key);
  await page.reload(); await hero.getByRole('button',{name:'查看上次小课'}).waitFor();
  await page.evaluate(key=>localStorage.setItem(key,'broken'),key); await page.reload();
  await panel.getByText('今日小课记录暂时无法读取，可以先选择其他主题。').waitFor();
  assert.equal(await hero.getByRole('button',{name:'开始今日小课'}).isDisabled(),true);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),'broken');
  await page.evaluate(()=>localStorage.setItem('word-atlas:v3:primary-progress:learner-default:primary-starter','broken'));
  await page.reload(); await panel.getByText('收藏记录暂时无法读取。').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.close();
 }
 console.log('英语今日小课状态、异常保护、桌面/375px 深浅主题通过');
} finally {await browser.close();}
