import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 const context=await browser.newContext();
 await context.addInitScript(()=>{Date.now=()=>1003;});
 const page=await context.newPage();
 await page.goto('http://localhost:5188/#/explore?course=primary-starter');
 await page.getByRole('button',{name:'开始小课',exact:true}).first().click();
 for(let i=0;i<2;i++) await page.getByRole('button',{name:'认识了，继续'}).click();
 const card=page.locator('.preview-study-card.is-recall');
 assert.equal(await card.getAttribute('data-question-kind'),'picture-word');
 const target=await card.getAttribute('data-content-id');
 await page.locator(`.preview-option:not([data-option-id="${target}"])`).first().click();
 await page.getByText('我们再认识一下。').waitFor();
 await page.getByRole('button',{name:'继续',exact:true}).click();
 for(let i=0;i<12;i++) {
  await page.waitForTimeout(100);
  const retry=await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('word-atlas:v3:primary-session:'));const s=JSON.parse(localStorage.getItem(key)).session;return !!s.steps[s.index]?.retry;});
  if(retry){await page.getByRole('button',{name:'先跳过，下次再认识'}).click();break;}
  const next=page.getByRole('button',{name:'认识了，继续'});
  if(await next.count()) await next.click();
  else await page.getByRole('button',{name:'先跳过，下次再认识'}).click();
 }
 await page.waitForFunction(()=>{const raw=localStorage.getItem('word-atlas:v3:activity:learner-default:primary-starter');return raw && Object.values(JSON.parse(raw).sessions).some(s=>Object.values(s.retryEvents??{}).includes('skipped'));});
 const raw=await page.evaluate(()=>JSON.parse(localStorage.getItem('word-atlas:v3:activity:learner-default:primary-starter')));
 assert.equal(Object.values(raw.sessions).reduce((n,s)=>n+Object.values(s.retryEvents??{}).filter(x=>x==='skipped').length,0),1);
 await page.waitForFunction(()=>{const raw=localStorage.getItem('word-atlas:v3:activity:learner-default:primary-starter');return raw && Object.values(JSON.parse(raw).sessions).some(s=>s.endReason==='completed' && typeof s.endedAt==='number');});
 await page.getByRole('button',{name:'返回主题'}).click();
 if (await page.getByRole('dialog').isVisible()) await page.getByRole('button',{name:'结束体验'}).click();
 await page.getByRole('button',{name:'学习记录'}).click();
 await page.getByText('已记录：重试时跳过 1 次 · 重试时资源暂不可用 0 次').waitFor();
 await page.reload();
 await page.getByText('已记录：重试时跳过 1 次 · 重试时资源暂不可用 0 次').waitFor();
 console.log('英语实际重试跳过、记录显示及刷新通过');
 await context.close();
} finally {await browser.close();}
