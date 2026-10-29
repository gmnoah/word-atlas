import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 const context=await browser.newContext();
 await context.addInitScript(()=>{
  Date.now=()=>1003;
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel:()=>{},addEventListener:()=>{},removeEventListener:()=>{}}});
 });
 const page=await context.newPage();
 await page.goto('http://localhost:5188/#/explore?course=hanzi-starter');
 await page.locator('.hanzi-map-stop').first().getByRole('button',{name:'认一认'}).click();
 for(let i=0;i<4 && !(await page.locator('.hanzi-study-card.is-recall').count());i++) await page.getByRole('button',{name:'认识了，继续'}).click();
 const card=page.locator('.hanzi-study-card.is-recall');
 await card.waitFor();
 const target=await card.getAttribute('data-content-id');
 await page.locator(`.hanzi-option:not([data-option-id="${target}"])`).first().click();
 await page.getByText('我们再认一认。').waitFor();
 await page.getByRole('button',{name:'继续',exact:true}).click();
 for(let i=0;i<12;i++) {
  await page.waitForTimeout(100);
  const retry=await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('word-atlas:v3:hanzi-session:'));const s=JSON.parse(localStorage.getItem(key)).session;return !!s.steps[s.index]?.retry;});
  if(retry){await page.getByRole('button',{name:'先跳过，下次再认识'}).click();break;}
  const intro=page.getByRole('button',{name:'认识了，继续'});
  if(await intro.count()) await intro.click(); else await page.getByRole('button',{name:'先跳过，下次再认识'}).click();
 }
 await page.waitForFunction(()=>{const raw=localStorage.getItem('word-atlas:v3:activity:learner-default:hanzi-starter');return raw && Object.values(JSON.parse(raw).sessions).some(s=>Object.values(s.retryEvents??{}).includes('skipped'));});
 await page.getByRole('button',{name:'返回主题'}).click();
 if(await page.getByRole('dialog').isVisible()) await page.getByRole('button',{name:'结束体验'}).click();
 await page.getByRole('button',{name:'学习记录'}).click();
 await page.getByText('已记录：重试时跳过 1 次 · 重试时资源暂不可用 0 次').waitFor();
 await page.getByText('独立答对 0 次 · 提示后答对 0 次 · 家长一起答对 0 次').waitFor();
 await page.reload();
 await page.getByText('已记录：重试时跳过 1 次 · 重试时资源暂不可用 0 次').waitFor();
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('word-atlas:v3:activity:learner-default:hanzi-starter')));
 assert.equal(Object.values(data.sessions).reduce((n,s)=>n+Object.values(s.retryEvents??{}).filter(x=>x==='skipped').length,0),1);
 console.log('汉字实际重试跳过、记录显示及刷新通过');
 await context.close();
} finally {await browser.close();}
