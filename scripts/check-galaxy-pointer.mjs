import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
const engine=process.env.BROWSER_ENGINE || 'chromium';
const browsers={chromium,firefox,webkit};
if (!Object.hasOwn(browsers,engine)) throw new Error('Unknown browser engine');
const browser=await browsers[engine].launch(engine==='chromium'?{headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'}:{headless:true});
try {
 for(const course of ['primary-starter','hanzi-starter']) for(const {touch,width} of engine==='chromium'?[{touch:false,width:1280},{touch:true,width:375}]:[{touch:false,width:1280},{touch:false,width:375}]) {
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:touch,serviceWorkers:'block'});
  await context.addInitScript(()=>localStorage.setItem('word-atlas:settings',JSON.stringify({onboarded:true,splash:false})));
  const page=await context.newPage(); await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
  await page.locator('.course-galaxy-section summary').click();
  const canvas=page.locator('.course-galaxy-sky canvas'); await canvas.waitFor();
  const map=page.getByRole('region',{name:'课程知识星图'});
  await map.getByText(/拖动或用方向键旋转/).waitFor();
  await map.getByLabel('选择主题').selectOption({index:1});
  await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  const beforeFocus=await canvas.screenshot();
  await map.getByRole('button',{name:/在星图中定位/}).click();
  await page.waitForTimeout(250);
  const markers=map.locator('.course-galaxy-markers circle');
  assert.equal(await markers.count(),await map.locator('.course-galaxy-entries button').count(),'每个主题条目应有单独标记');
  assert.ok(await markers.first().evaluate(el=>getComputedStyle(el).visibility==='visible'),'主题标记应投影到地图');
  await map.getByText('看过 0 / 300').waitFor();
  assert.notDeepEqual(await canvas.screenshot(),beforeFocus,'定位主题应改变星图视角');
  await map.getByRole('button',{name:'重置星图'}).click();
  assert.equal(await markers.count(),0,'重置后应清除主题标记');
  await canvas.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  let rect=await canvas.boundingBox();
  await canvas.focus();
  const before=await canvas.screenshot();
  const scrollBefore=await page.evaluate(()=>scrollY);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('+');
  await page.waitForTimeout(200);
  assert.notDeepEqual(await canvas.screenshot(),before,'键盘旋转和缩放应改变星图画面');
  assert.equal(await page.evaluate(()=>scrollY),scrollBefore,'操作星图时方向键不应滚动页面');
  await map.getByRole('button',{name:'重置星图'}).click(); await page.waitForTimeout(500);
  const beforeDrag=await canvas.screenshot();
  const x=rect.x+rect.width*.5,y=rect.y+rect.height*.5;
  if(touch) {
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+85,y:y+35}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } else { await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+85,y+35,{steps:6}); await page.mouse.up(); }
  assert.equal(await page.getByRole('dialog').count(),0,'拖动不应打开词卡');
  await page.waitForTimeout(250); const after=await canvas.screenshot(); assert.notDeepEqual(beforeDrag,after,'拖动应改变星图画面');
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
  let opened=false, previewLabel=null;
  for(let py=45;py<rect.height-45 && !opened;py+=32) for(let px=45;px<rect.width-45 && !opened;px+=32) {
   if(touch) await page.touchscreen.tap(rect.x+px,rect.y+py);
   else {
    await page.mouse.move(rect.x+px,rect.y+py);
    const preview=map.locator('.course-galaxy-preview strong');
    if(!await preview.count()) continue;
    previewLabel=await preview.innerText();
    await page.mouse.click(rect.x+px,rect.y+py);
   }
   opened=await page.getByRole('dialog').count()>0;
  }
  assert.equal(opened,true,'点击星点应打开对应词卡');
  const data=await page.evaluate(async courseId=>{
   const id=new URLSearchParams(location.hash.split('?')[1]??'').get('entry');
   const {loadCourse}=await import('/src/atlas/data.ts'); const entry=await (await loadCourse(courseId)).entry(id);
   return {id,label:entry.kind==='hanzi'?entry.character:entry.word};
  },course);
  assert.ok(data.id); await page.getByRole('dialog').getByText(data.label,{exact:true}).first().waitFor();
  if(!touch) assert.equal(previewLabel,data.label,'悬停预览应与打开的词卡一致');
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  assert.equal(await page.getByRole('dialog').count(),0); await context.close();
 }
 console.log(`${engine}：两课程星图键盘、鼠标${engine==='chromium'?'与模拟触摸':''}拖动及点选词卡匹配通过`);
} finally {await browser.close();}
