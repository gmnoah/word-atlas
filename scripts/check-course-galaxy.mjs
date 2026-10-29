import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
let webglVerified=false;
try {
 for(const course of ['primary-starter','hanzi-starter']) for(const width of [375,1280]) for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'});
  await context.addInitScript(theme=>localStorage.setItem('word-atlas:settings',JSON.stringify({theme,onboarded:true,splash:true})),theme);
  const page=await context.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
  const opening=page.getByRole('button',{name:'跳过开场'}); await opening.waitFor(); await opening.click();
  assert.equal(await opening.count(),0);
  const section=page.locator('.course-galaxy-section'); await section.locator('summary').click();
  const map=page.getByRole('region',{name:'课程知识星图'}); await map.waitFor();
  if(await map.getByText(/拖动旋转，双指缩放/).count()) webglVerified=true;
  await map.getByText('看过 0 / 300').waitFor();
  const canvas=map.getByRole('img',{name:/知识星图，共 300/}); await canvas.waitFor();
  assert.ok(await map.getByRole('button',{name:'放大星图'}).evaluate(el=>el.getBoundingClientRect().height)>=48);
  await map.getByRole('button',{name:'放大星图'}).click(); await map.getByRole('button',{name:'缩小星图'}).click(); await map.getByRole('button',{name:'重置星图'}).click();
  const select=map.getByLabel('选择主题'); const opts=await select.locator('option').count(); assert.ok(opts>1); await select.selectOption({index:1});
  await map.locator('.course-galaxy-entries button').first().click(); await page.getByRole('dialog').waitFor(); await page.getByRole('button',{name:'关闭',exact:true}).click();
  const stop=page.locator('.journey-stop').first();
  await stop.getByRole('button',{name:course==='hanzi-starter'?'一起读一读':'开始小课'}).click();
  await page.getByRole('button',{name:course==='hanzi-starter'?'看过啦，下一个':'认识了，继续'}).click();
  await page.getByRole('button',{name:'返回主题'}).click(); await page.getByRole('button',{name:'结束体验'}).click();
  if(!await page.locator('.course-galaxy-section').evaluate(el=>el.open)) await page.locator('.course-galaxy-section summary').click();
  await page.getByRole('region',{name:'课程知识星图'}).getByText('看过 1 / 300').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true); assert.deepEqual(errors,[]);
  await page.reload(); assert.equal(await opening.count(),0);
  await context.close();
 }
 for(const course of ['primary-starter','hanzi-starter']) {
  const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(()=>{localStorage.setItem('word-atlas:settings',JSON.stringify({onboarded:true,splash:true}));const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});
  const page=await context.newPage(); await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
  assert.equal(await page.getByRole('button',{name:'跳过开场'}).count(),0);
  await page.locator('.course-galaxy-section summary').click();
  await page.getByText(/此设备暂不支持三维画面/).waitFor();
  assert.ok(await page.locator('.course-galaxy-entries button').count()>0);
  await context.close();
  const disabled=await browser.newContext({serviceWorkers:'block'});
  await disabled.addInitScript(()=>localStorage.setItem('word-atlas:settings',JSON.stringify({onboarded:true,splash:false})));
  const quiet=await disabled.newPage(); await quiet.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
  await quiet.locator('.preview-hero').waitFor();
  assert.equal(await quiet.getByRole('button',{name:'跳过开场'}).count(),0);
  await disabled.close();
 }
 console.log(`两课程开场、星图、词卡及无 WebGL 回退通过；WebGL 分支${webglVerified?'已运行':'未运行（仅降级）'}`);
} finally {await browser.close();}
