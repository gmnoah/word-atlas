import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
const engines={chromium,firefox,webkit}, engine=process.env.BROWSER_ENGINE || 'chromium';
const browser=await engines[engine].launch(engine==='chromium'?{headless:true,channel:process.env.PREVIEW_BROWSER||'chrome'}:{headless:true});
try {
 for(const course of ['primary-starter','hanzi-starter']) for(const width of [375,1280]) for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(theme=>localStorage.setItem('word-atlas:settings',JSON.stringify({theme,onboarded:true,splash:false})),theme);
  const page=await context.newPage(), errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
  const stop=page.locator('.journey-stop').first(); await stop.waitFor();
  await page.locator('.course-galaxy-section summary').click();
  const map=page.getByRole('region',{name:'课程知识星图'}); await map.waitFor();
  await map.getByText('看过 0 / 300').waitFor();
  await map.getByLabel('选择主题').selectOption({index:1});
  await map.locator('.course-galaxy-entries button').first().click();
  await page.getByRole('dialog').waitFor(); await page.getByRole('button',{name:'关闭',exact:true}).click();
  await stop.getByRole('button',{name:course==='hanzi-starter'?'一起读一读':'开始小课'}).click();
  await page.getByRole('button',{name:course==='hanzi-starter'?'看过啦，下一个':'认识了，继续'}).click();
  await page.getByRole('button',{name:'返回旅程'}).click(); await page.getByRole('button',{name:'结束体验'}).click();
  await page.getByRole('button',{name:'学习记录'}).click();
  await page.getByRole('region',{name:'详细活动记录'}).locator('.activity-week li').last().getByText(/有日期看过 1 次/).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log(`${engine} ${browser.version()}：两课程旅程、星图、词卡、学习记录及桌面/375px 双主题通过`);
} finally {await browser.close();}
