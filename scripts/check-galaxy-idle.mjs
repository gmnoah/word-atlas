import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
const engine=process.env.BROWSER_ENGINE || 'chromium';
const browser=await ({chromium,webkit})[engine].launch(engine==='chromium'?{headless:true,channel:'chrome'}:{headless:true});
try {
 for(const course of ['primary-starter','hanzi-starter']) {
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{
   localStorage.setItem('word-atlas:settings',JSON.stringify({onboarded:true,splash:false}));
   const original=window.requestAnimationFrame.bind(window); window.__frameCalls=0;
   window.requestAnimationFrame=callback=>{window.__frameCalls++;return original(callback);};
  });
  const page=await context.newPage(); await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
  await page.locator('.course-galaxy-section summary').click(); const canvas=page.locator('.course-galaxy-sky canvas'); await canvas.waitFor();
  await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  const before=await page.evaluate(()=>window.__frameCalls); await page.waitForTimeout(800);
  const after=await page.evaluate(()=>window.__frameCalls); assert.ok(after-before<=2,`空闲时不应持续请求动画帧（${after-before}）`);
  const pixel=await canvas.evaluate(el=>{const gl=el.getContext('webgl2');if(!gl)return null;const p=new Uint8Array(4);gl.readPixels(Math.floor(el.width/2),Math.floor(el.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return [...p];});
  if(pixel) assert.ok(pixel[0]+pixel[1]+pixel[2]>0,'静止后画布应保留画面');
  await context.close();
 }
 console.log(`${engine} 两课程星图空闲时无持续动画帧，画面保留通过`);
} finally {await browser.close();}
