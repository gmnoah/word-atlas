import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for(const course of ['primary-starter','hanzi-starter']) for(const touch of [false,true]) {
  const context=await browser.newContext({viewport:{width:touch?375:1280,height:900},hasTouch:touch,serviceWorkers:'block'});
  await context.addInitScript(()=>localStorage.setItem('word-atlas:settings',JSON.stringify({onboarded:true,splash:false})));
  const page=await context.newPage(); await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
  await page.locator('.course-galaxy-section summary').click();
  const canvas=page.locator('.course-galaxy-sky canvas'); await canvas.waitFor();
  const map=page.getByRole('region',{name:'课程知识星图'});
  await map.getByText(/拖动旋转，双指缩放/).waitFor();
  await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  let rect=await canvas.boundingBox(); const before=await canvas.screenshot();
  const x=rect.x+rect.width*.5,y=rect.y+rect.height*.5;
  if(touch) {
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+85,y:y+35}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } else { await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+85,y+35,{steps:6}); await page.mouse.up(); }
  assert.equal(await page.getByRole('dialog').count(),0,'拖动不应打开词卡');
  await page.waitForTimeout(250); const after=await canvas.screenshot(); assert.notDeepEqual(before,after,'拖动应改变星图画面');
  if(touch) {
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-20,y,id:1},{x:x+20,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-65,y,id:1},{x:x+65,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(250);
   assert.notDeepEqual(await canvas.screenshot(),after,'双指缩放应改变星图画面');
   assert.equal(await page.getByRole('dialog').count(),0,'双指缩放不应打开词卡');
  }
  await map.getByRole('button',{name:'重置星图'}).click(); await page.waitForTimeout(500); rect=await canvas.boundingBox();
  let opened=false;
  for(let py=45;py<rect.height-45 && !opened;py+=32) for(let px=45;px<rect.width-45 && !opened;px+=32) {
   if(touch) await page.touchscreen.tap(rect.x+px,rect.y+py); else await page.mouse.click(rect.x+px,rect.y+py);
   opened=await page.getByRole('dialog').count()>0;
  }
  assert.equal(opened,true,'点击星点应打开对应词卡');
  const data=await page.evaluate(async courseId=>{
   const id=new URLSearchParams(location.hash.split('?')[1]??'').get('entry');
   const {loadCourse}=await import('/src/atlas/data.ts'); const entry=await (await loadCourse(courseId)).entry(id);
   return {id,label:entry.kind==='hanzi'?entry.character:entry.word};
  },course);
  assert.ok(data.id); await page.getByRole('dialog').getByText(data.label,{exact:true}).first().waitFor();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  assert.equal(await page.getByRole('dialog').count(),0); await context.close();
 }
 console.log('两课程星图鼠标与模拟触摸拖动、点选词卡匹配通过');
} finally {await browser.close();}
