import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 const context = await browser.newContext();
 const first = await context.newPage();
 const second = await context.newPage();
 await first.goto('http://localhost:5188/#/explore?course=hanzi-starter');
 await second.goto('http://localhost:5188/#/explore?course=hanzi-starter');
 await first.locator('.hanzi-map-stop').first().getByRole('button',{name:'只读一读'}).click();
 await first.getByRole('heading',{name:'一个字，一个小发现'}).waitFor();
 await second.locator('.hanzi-map-stop').first().getByRole('button',{name:'只读一读'}).click();
 await second.getByRole('heading',{name:'一个字，一个小发现'}).waitFor();
 await second.getByRole('button',{name:'看过啦，下一个'}).click();
 await first.getByRole('button',{name:'看过啦，下一个'}).click();
 await first.getByText(/本地记录不可用或已在其他页面更改/).waitFor();
 const data = await first.evaluate(() => JSON.parse(localStorage.getItem('word-atlas:v3:activity:learner-default:hanzi-starter')));
 assert.equal(Object.keys(data.sessions).length, 1);
 assert.ok(Object.values(data.sessions)[0].introduced.length > 0);
 console.log('同主题旧标签页停止覆盖并保留已保存活动');
 await context.close();
} finally { await browser.close(); }
