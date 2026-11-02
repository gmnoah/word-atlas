import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for(const course of ['primary-starter','hanzi-starter']) for(const width of [375,1280]) {
  const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'});
  await context.addInitScript(()=>localStorage.setItem('word-atlas:settings',JSON.stringify({theme:'dark',onboarded:true,splash:false})));
  const page=await context.newPage(), errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
  const stop=page.locator('.journey-stop').first();
  await stop.getByRole('button',{name:course==='hanzi-starter'?'一起读一读':'开始小课'}).click();
  await page.getByRole('button',{name:course==='hanzi-starter'?'看过啦，下一个':'认识了，继续'}).click();
  await page.getByRole('button',{name:'返回旅程'}).click(); await page.getByRole('button',{name:'结束本次学习'}).click();
  await page.locator('.course-galaxy-section summary').click();
  const map=page.getByRole('region',{name:'课程知识星图'}), canvas=map.locator('canvas');
  await map.getByText('看过 1 / 300').waitFor();
  await map.getByText(/拖动或用方向键旋转/).waitFor();
  const supported=await canvas.evaluate(el=>{window.__mapLoss=el.getContext('webgl2')?.getExtension('WEBGL_lose_context');return !!window.__mapLoss;});
  assert.equal(supported,true,'测试设备需要 WEBGL_lose_context');
  await page.evaluate(()=>window.__mapLoss.loseContext());
  await map.getByText(/星图画面暂时中断/).waitFor();
  assert.equal(await map.locator('.course-galaxy-sky').isVisible(),false);
  await map.locator('.course-galaxy-fallback').getByText('看过 1 / 300').waitFor();
  assert.equal(await canvas.getAttribute('tabindex'),'-1');
  assert.equal(await map.getByRole('button',{name:'放大星图'}).count(),0);
  await map.locator('.course-galaxy-entries button').first().click(); await page.getByRole('dialog').waitFor(); await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.evaluate(()=>window.__mapLoss.restoreContext());
  await map.getByText(/拖动或用方向键旋转/).waitFor({timeout:10000});
  await map.getByText('看过 1 / 300').waitFor();
  assert.equal(await canvas.getAttribute('tabindex'),'0');
  const pixel=await canvas.evaluate(el=>{const gl=el.getContext('webgl2'), p=new Uint8Array(4);gl.readPixels(Math.floor(el.width/2),Math.floor(el.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return [...p];});
  assert.ok(pixel[0]+pixel[1]+pixel[2]>0,'恢复后画布应重新绘制');
  await map.getByRole('button',{name:'放大星图'}).click();
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('两课程 WebGL 中断、主题列表使用及自动恢复通过');
} finally {await browser.close();}
