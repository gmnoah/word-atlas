import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 for(const course of ['primary-starter','hanzi-starter']){
  const context=await browser.newContext(); const page=await context.newPage();
  await page.goto(`http://localhost:5188/#/explore?course=${course}`);
  if(course==='primary-starter') await page.getByRole('button',{name:'开始小课',exact:true}).first().click();
  else await page.locator('.hanzi-map-stop').first().getByRole('button',{name:'只读一读'}).click();
  await page.getByRole('button',{name:course==='primary-starter' ? '认识了，继续' : '看过啦，下一个'}).click();
  await page.getByRole('button',{name:'返回主题'}).click();
  await page.getByRole('button',{name:'结束体验'}).click();
  const previous=course==='primary-starter' ? '0.3.0-draft' : '0.6.0-draft';
  const current=course==='primary-starter' ? '0.4.0-draft' : '0.7.0-draft';
  await page.evaluate(({course,previous})=>{
   const prefix=course==='primary-starter'?'word-atlas:v3:primary-session:':'word-atlas:v3:hanzi-session:';
   const key=Object.keys(localStorage).find(k=>k.startsWith(prefix)); const checkpoint=JSON.parse(localStorage.getItem(key));
   checkpoint.session.contentVersion=previous; localStorage.setItem(key,JSON.stringify(checkpoint));
   const activityKey=`word-atlas:v3:activity:learner-default:${course}`; const activity=JSON.parse(localStorage.getItem(activityKey));
   for(const session of Object.values(activity.sessions)){session.contentVersion=previous;delete session.contentVersions;}
   localStorage.setItem(activityKey,JSON.stringify(activity));
  },{course,previous});
  if(course==='primary-starter') await page.getByRole('button',{name:'开始小课',exact:true}).first().click();
  else await page.locator('.hanzi-map-stop').first().getByRole('button',{name:'只读一读'}).click();
  await page.waitForFunction(({course,previous,current})=>{
   const raw=localStorage.getItem(`word-atlas:v3:activity:learner-default:${course}`);
   return raw && Object.values(JSON.parse(raw).sessions).some(s=>s.contentVersion===previous && s.contentVersions?.includes(current));
  },{course,previous,current});
  const raw=await page.evaluate(course=>JSON.parse(localStorage.getItem(`word-atlas:v3:activity:learner-default:${course}`)),course);
  assert.equal(Object.keys(raw.sessions).length,1);
  assert.equal(await page.getByText(/学习结果暂时无法保存|认识结果暂时无法保存/).count(),0);
  await context.close();
 }
 console.log('两课程旧版断点及活动记录升级恢复通过');
} finally {await browser.close();}
