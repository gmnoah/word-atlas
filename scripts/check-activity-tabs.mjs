import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true,channel:process.env.PREVIEW_BROWSER || 'chrome'});
try {
 const context = await browser.newContext();
 const records = await context.newPage();
 await records.goto('http://localhost:5188/#/explore?course=hanzi-starter&view=records');
 await records.getByText('还没有详细活动记录。之后的小课会在这里留下记录。').waitFor();
 const learner = await context.newPage();
 await learner.goto('http://localhost:5188/#/explore?course=hanzi-starter');
 await learner.locator('.hanzi-map-stop').first().getByRole('button',{name:'只读一读'}).click();
 await learner.getByRole('button',{name:'看过啦，下一个'}).click();
 await records.getByText('一起共读 1 次').waitFor();
 console.log('跨标签页共读活动更新通过');
 await context.close();
} finally { await browser.close(); }
