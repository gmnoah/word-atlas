import assert from "node:assert/strict";
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PREVIEW_BROWSER || "chrome",
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();

  // 1. 初始化 settings 避免 onboarding
  await context.addInitScript(() => {
    localStorage.setItem(
      "word-atlas:settings",
      JSON.stringify({
        theme: "dark",
        voice: "uk",
        target: 20,
        volume: 80,
        sfx: true,
        autoPlayAudio: false,
        autoAdvance: false,
        dailyTarget: 20,
        showWordList: true,
        reducedMotion: false,
        ambientSound: "none",
        ambientVolume: 20,
        hasCompletedOnboarding: true,
        splash: false,
      })
    );
  });

  console.log("1. 打开学习空间探索中心 (#/explore)...");
  await page.goto("http://localhost:5188/#/explore");
  await page.waitForSelector(".preview-spaces");

  // 检查是否显示初中英语空间卡片
  const middleCard = page.locator('.preview-space[data-course-id="middle-english"]');
  await middleCard.waitFor({ state: "visible" });
  const badgeText = await middleCard.locator(".preview-space-art span").textContent();
  assert.equal(badgeText?.trim(), "初中衔接");
  const titleText = await middleCard.locator("h3").textContent();
  assert.equal(titleText?.trim(), "初中英语");
  console.log("✔ 初中英语空间卡片展示正确，徽标为：初中衔接，标题：初中英语");

  console.log("2. 点击初中英语卡片进入旅程...");
  const enterBtn = middleCard.locator("button, a").filter({ hasText: /开始旅程|继续旅程/ });
  await enterBtn.click();

  // 等待进入探索页
  await page.waitForSelector(".preview-hero, .primary-journey");
  console.log("✔ 成功进入初中英语空间旅程页面");

  console.log("3. 切换到主题图鉴查看 10 个单元与词卡...");
  const atlasBtn = page.locator("button, a").filter({ hasText: "选择主题" }).first();
  if (await atlasBtn.isVisible()) {
    await atlasBtn.click();
  } else {
    await page.goto("http://localhost:5188/#/explore?course=middle-english&view=atlas");
  }
  await page.waitForSelector(".preview-lessons");

  const tiles = page.locator(".preview-lesson-tile");
  const tileCount = await tiles.count();
  assert.equal(tileCount, 10, `应渲染 10 个初中单元，实际渲染 ${tileCount}`);
  console.log(`✔ 成功渲染 ${tileCount} 个精选初中主题单元`);

  // 检查第一个单元名称
  const firstTileTitle = await tiles.first().locator("h2").textContent();
  assert.equal(firstTileTitle?.trim(), "校园生活与日常");
  console.log("✔ 第一单元标题匹配：校园生活与日常");

  console.log("4. 打开第一个词卡（grade）...");
  const firstWordBtn = tiles.first().locator(".preview-entry-link").first();
  const wordLabel = await firstWordBtn.textContent();
  assert.equal(wordLabel?.trim(), "grade");
  await firstWordBtn.click();

  // 等待词卡 Sheet 弹出
  await page.waitForSelector(".sheet .course-entry-detail");
  const sheetWord = await page.locator(".course-entry-detail h2").textContent();
  assert.equal(sheetWord?.trim(), "grade");
  console.log("✔ 词卡详情弹层展示成功：grade");

  // 验证释义与例句
  const meaningText = await page.locator(".course-entry-detail h2 + p").textContent();
  assert.ok(meaningText?.includes("成绩"), "释义应包含成绩");
  const exampleText = await page.locator(".course-entry-detail .preview-example").textContent();
  assert.ok(exampleText?.includes("grade"), "例句中应包含目标词");
  console.log("✔ 词卡释义与例句核对无误");

  // 关闭词卡
  await page.keyboard.press("Escape");
  await page.waitForSelector(".sheet", { state: "detached" });
  console.log("✔ 词卡弹层平滑关闭");

  console.log("5. 点击'开始小课'启动初中英语小课练习...");
  const startLessonBtn = tiles.first().locator("button.btn-primary").filter({ hasText: /开始小课|继续小课/ });
  await startLessonBtn.click();

  // 等待小课加载
  await page.waitForSelector(".preview-study");
  console.log("✔ 成功进入初中英语小课交互界面");

  // 验证小课顶栏与进度条
  const lessonTitle = await page.locator(".preview-study-toolbar span").first().textContent();
  assert.equal(lessonTitle?.trim(), "校园生活与日常");
  console.log("✔ 小课顶栏标题匹配：校园生活与日常");

  // 推进小课第一步
  const nextBtn = page.locator("button.btn-primary").filter({ hasText: /认识了|继续|下一个/ }).first();
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    console.log("✔ 小课认识词条步骤正常推进");
  }

  // 退出小课
  const exitBtn = page.locator(".preview-study-toolbar button").filter({ hasText: "返回主题" });
  await exitBtn.click();
  // 如果有二次确认退出弹层
  const confirmExit = page.locator(".sheet button").filter({ hasText: "结束本次学习" });
  if (await confirmExit.isVisible()) {
    await confirmExit.click();
  }
  await page.waitForSelector(".preview-lessons");
  console.log("✔ 退出小课安全返回主题图鉴");

  console.log("6. 检查数据隔离性...");
  const keys = await page.evaluate(() => Object.keys(localStorage));
  const middleKeys = keys.filter(k => k.includes("middle-english"));
  console.log("✔ 初中英语本地存储 key 已建立：", middleKeys);
  assert.ok(middleKeys.length > 0, "应生成 middle-english 独立作用域数据");

  // 验证 375px 移动端窄屏适配
  console.log("7. 验证 375px 窄屏响应式...");
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForSelector(".preview-lessons");
  const firstTileBox = await tiles.first().boundingBox();
  assert.ok(firstTileBox && firstTileBox.width <= 375, "窄屏下单元卡片自适应容器宽度");
  console.log("✔ 375px 窄屏适配响应正常");

  await browser.close();
  console.log("\n🎉 初中英语端到端全流程、数据隔离与响应式验收全部通过！");
}

main().catch(err => {
  console.error("❌ 验收失败：", err);
  process.exit(1);
});
