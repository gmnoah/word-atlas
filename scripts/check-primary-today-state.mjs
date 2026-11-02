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
  await page.getByRole('button',{name:'返回旅程'}).click(); await page.getByRole('button',{name:'结束本次学习'}).click();
  await hero.getByRole('button',{name:'继续今日小课'}).waitFor();
  await panel.getByText('上次的小课还在这里，随时接着学习。').waitFor();
  const key='word-atlas:v3:primary-session:learner-default:primary-starter:today';
  await page.evaluate(key=>{const c=JSON.parse(localStorage.getItem(key));c.session.index=c.session.steps.length;c.session.endedAt=Date.now();c.session.endReason='completed';localStorage.setItem(key,JSON.stringify(c));},key);
  await page.reload(); await hero.getByRole('button',{name:'查看上次小课'}).waitFor();
  await page.evaluate(key=>localStorage.setItem(key,'broken'),key); await page.reload();
  await panel.getByText('今日小课记录暂时无法读取，可以先选择其他主题。').waitFor();
  await hero.getByText('今日小课记录暂时无法读取，原记录已保留。可以选择其他主题。').waitFor();
  assert.equal(await panel.getByText('学习进度暂时无法读取或保存，原记录已保留。').count(), 0);
  assert.equal(await hero.getByRole('button',{name:'开始今日小课'}).count(),0);
  assert.equal(await hero.getByRole('button',{name:'小课记录待恢复'}).isDisabled(),true);
  await hero.getByRole('button',{name:'打开家长设置'}).click();
  await page.getByRole('dialog').getByText('备份与恢复').waitFor();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),'broken');
  await page.evaluate(()=>localStorage.setItem('word-atlas:v3:primary-progress:learner-default:primary-starter','broken'));
  await page.reload(); await panel.getByText('收藏记录暂时无法读取，原记录已保留。').waitFor();
  await hero.getByText('学习进度暂时无法读取，原记录已保留。').waitFor();
  assert.equal(await hero.getByRole('button',{name:'开始今日小课'}).count(),0);
  assert.equal(await hero.getByRole('button',{name:'学习记录待恢复'}).isDisabled(),true);
  assert.equal(await page.getByText('学习进度暂时无法读取，原记录已保留。').count(),1);
  assert.equal(await page.getByText('收藏记录暂时无法读取，原记录已保留。').count(),1);
  assert.equal(await page.getByText('收藏暂时无法保存，原记录已保留。').count(),0);
  const recovery=hero.getByRole('button',{name:'打开家长设置'});
  assert.ok(await recovery.evaluate(el=>el.getBoundingClientRect().height)>=48);
  await recovery.click();
  await page.getByRole('dialog').getByText('备份与恢复').waitFor();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('word-atlas:v3:primary-progress:learner-default:primary-starter')),'broken');
  await page.getByRole('button',{name:'主题图鉴',exact:true}).click();
  await panel.getByText('学习进度暂时无法读取，原记录已保留。').waitFor();
  assert.equal(await page.getByText('学习进度暂时无法读取，原记录已保留。').count(),1);
  await panel.getByRole('button',{name:'打开家长设置'}).click();
  await page.getByRole('dialog').getByText('备份与恢复').waitFor();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

  const progressKey='word-atlas:v3:primary-progress:learner-default:primary-starter';
  await page.evaluate(progressKey=>localStorage.removeItem(progressKey),progressKey);
  await page.goto('http://localhost:5188/#/explore?course=primary-starter&view=atlas');
  await page.getByRole('button',{name:'查看 apple 词卡'}).first().click();
  const detail=page.getByRole('dialog',{name:'课程条目'});
  await page.evaluate(progressKey=>{
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key===progressKey) throw new DOMException('test quota','QuotaExceededError');
      return original.call(this,key,value);
    };
  },progressKey);
  await detail.getByRole('button',{name:'收藏这个词'}).click();
  await detail.getByText('收藏暂时无法保存，原记录已保留。').waitFor();
  await detail.getByRole('button',{name:'收藏这个词'}).waitFor();
  const retry=detail.getByRole('button',{name:'再试一次'});
  assert.ok(await retry.evaluate(el=>el.getBoundingClientRect().height)>=48);
  await retry.click();
  await detail.getByText('收藏暂时无法保存，原记录已保留。').waitFor();
  assert.equal(await page.evaluate(progressKey=>localStorage.getItem(progressKey),progressKey),null);
  assert.equal(await detail.getByText('收藏记录暂时无法读取，原记录已保留。').count(),0);
  await detail.getByRole('button',{name:'关闭'}).click();
  await context.close();
 }
 console.log('英语今日小课状态、读取/写入异常区分与保护、桌面/375px 深浅主题通过');
} finally {await browser.close();}
