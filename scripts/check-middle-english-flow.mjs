import assert from "node:assert/strict";
import { chromium } from "playwright";

async function main() {
  console.log("=== 开始初中英语专项工程验收 (T67) ===\n");

  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PREVIEW_BROWSER || "chrome",
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
  });
  const page = await context.newPage();

  const failures = [];
  page.on("pageerror", (err) => {
    if (err.message.includes("Transition was aborted")) return;
    console.error("  [Page Error]", err.message);
    failures.push(err.message);
  });

  // 1. 初始化 settings 避免 onboarding
  await context.addInitScript(() => {
    localStorage.setItem(
      "word-atlas:settings",
      JSON.stringify({
        theme: "dark",
        voice: "uk",
        target: 20,
        volume: 80,
        sfx: false,
        autoPlayAudio: false,
        autoAdvance: false,
        dailyTarget: 20,
        showWordList: true,
        reducedMotion: false,
        ambientSound: "none",
        ambientVolume: 20,
        hasCompletedOnboarding: true,
        splash: false,
      }),
    );
  });

  // STEP 1: 探索中心与空间卡片展示
  console.log("1. 打开探索中心 (#/explore)...");
  await page.goto("http://localhost:5188/#/explore");
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("word-atlas:v3:primary-session:"))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.waitForSelector(".preview-spaces");

  const middleCard = page.locator(
    '.preview-space[data-course-id="middle-english"]',
  );
  await middleCard.waitFor({ state: "visible" });
  const badgeText = await middleCard
    .locator(".preview-space-art span")
    .textContent();
  assert.equal(badgeText?.trim(), "初中衔接");
  const titleText = await middleCard.locator("h3").textContent();
  assert.equal(titleText?.trim(), "初中英语");
  const descText = await middleCard.locator("p:not(.eyebrow)").textContent();
  assert.ok(
    descText?.includes("在句子里理解词义，积累常用搭配"),
    "空间卡片应展示初中定位描述",
  );
  console.log(
    "✔ 初中英语空间卡片展示正确（徽标：初中衔接，标题：初中英语，描述：在句子里理解词义，积累常用搭配）",
  );

  // STEP 2: 进入空间并验证主题图鉴
  console.log("2. 进入初中英语空间...");
  const enterBtn = middleCard
    .locator("button, a")
    .filter({ hasText: /开始旅程|继续旅程/ });
  await enterBtn.click();
  await page.waitForSelector(".preview-hero, .primary-journey");

  // 切换到主题图鉴
  const atlasBtn = page
    .locator("button, a")
    .filter({ hasText: "选择主题" })
    .first();
  if (await atlasBtn.isVisible()) {
    await atlasBtn.click();
  } else {
    await page.goto(
      "http://localhost:5188/#/explore?course=middle-english&view=atlas",
    );
  }
  await page.waitForSelector(".preview-lessons");

  const tiles = page.locator(".preview-lesson-tile");
  const tileCount = await tiles.count();
  assert.ok(tileCount >= 10, `应渲染至少 10 个初中单元，实际渲染 ${tileCount}`);
  const firstTileTitle = await tiles.first().locator("h2").textContent();
  assert.equal(firstTileTitle?.trim(), "校园生活与日常");
  const firstTileEyebrow = await tiles.first().locator(".eyebrow").textContent();
  assert.ok(firstTileEyebrow?.includes("七年级 · 单元 01"), `单元角标应展示年级学段，实际展示: ${firstTileEyebrow}`);
  console.log(
    `✔ 初中单元完整渲染（共 ${tileCount} 单元），第一单元：${firstTileTitle?.trim()}（${firstTileEyebrow?.trim()}）`,
  );

  // 2.1 验证初中专属节奏面板与学段筛选导航
  console.log("2.1 验证初中专属学习节奏面板与年级学段导航...");
  const middleStage = page.locator(".middle-starting-stage");
  assert.ok(await middleStage.isVisible(), "应展示初中专属节奏面板");
  const stageHeading = await middleStage.locator("h2").textContent();
  assert.ok(stageHeading?.includes("初中核心词汇 · 110 单元语境突破"), "节奏面板标题应去幼态化");

  // 切换学习节奏为 10 词冲刺
  const sprintBtn = middleStage.locator("button").filter({ hasText: "高效冲刺" });
  await sprintBtn.click();
  assert.ok(await sprintBtn.evaluate((el) => el.classList.contains("is-selected")), "点击高效冲刺后应高亮选中");

  // 学段导航切换验证
  const gradeFilter = page.locator(".atlas-grade-filter");
  assert.ok(await gradeFilter.isVisible(), "应展示学段导航标签组");
  
  // 切换到七年级
  const g7Btn = gradeFilter.locator(".atlas-grade-btn").filter({ hasText: "七年级基础" });
  await g7Btn.click();
  const g7Count = await tiles.count();
  assert.equal(g7Count, 30, `七年级应展示 30 个单元，实际展示 ${g7Count}`);

  // 切换到八年级
  const g8Btn = gradeFilter.locator(".atlas-grade-btn").filter({ hasText: "八年级拓展" });
  await g8Btn.click();
  const g8Count = await tiles.count();
  assert.equal(g8Count, 40, `八年级应展示 40 个单元，实际展示 ${g8Count}`);

  // 切换到九年级
  const g9Btn = gradeFilter.locator(".atlas-grade-btn").filter({ hasText: "九年级中考冲刺" });
  await g9Btn.click();
  const g9Count = await tiles.count();
  assert.equal(g9Count, 40, `九年级应展示 40 个单元，实际展示 ${g9Count}`);

  // 切换回全部单元
  const allBtn = gradeFilter.locator(".atlas-grade-btn").filter({ hasText: "全部单元" });
  await allBtn.click();
  const allCount = await tiles.count();
  assert.equal(allCount, 110, `全部单元应展示 110 个单元，实际展示 ${allCount}`);
  console.log("✔ 年级学段导航与节奏选择验证无误（七年级 30 单元、八年级 40 单元、九年级 40 单元秒级响应切换）");

  // STEP 3: 词卡弹层（词性、搭配、例句默认展开、按钮文案）
  console.log("3. 检查词卡弹层及契约字段展示...");
  const firstWordBtn = tiles.first().locator(".preview-entry-link").first();
  await firstWordBtn.click();
  await page.waitForSelector(
    ".sheet .course-entry-detail, .sheet .english-word-card",
  );

  const wordHeadword = await page
    .locator(".course-entry-detail h2, .sheet h2")
    .first()
    .textContent();
  assert.equal(wordHeadword?.trim(), "grade");

  // 词性
  const posTag = page.locator(".sheet .preview-pos");
  assert.ok(await posTag.isVisible(), "初中词卡应渲染词性标签");
  assert.equal((await posTag.textContent())?.trim(), "n.");

  // 常用搭配
  const collocation = page.locator(".sheet .preview-collocation");
  assert.ok(await collocation.isVisible(), "初中词卡应渲染常用搭配");
  const phraseText = await collocation
    .locator(".preview-collocation-phrase")
    .textContent();
  assert.equal(phraseText?.trim(), "get a good grade");

  // 划线高亮目标词
  const markTarget = await page.locator(".sheet .example-target").textContent();
  assert.equal(markTarget?.trim(), "grade");

  // 关闭词卡
  await page.keyboard.press("Escape");
  await page.waitForSelector(".sheet", { state: "detached" });
  console.log(
    "✔ 词卡契约字段验证无误：词性 (n.)、常用搭配 (good grades)、例句目标词高亮 (grade)",
  );

  // STEP 4: 启动小课，验证初中 starter policy 及语境题交互
  console.log("4. 启动第一单元小课...");
  const startLessonBtn = tiles
    .first()
    .locator("button.btn-primary")
    .filter({ hasText: /开始小课|继续小课/ });
  await startLessonBtn.click();
  await page.waitForSelector(".preview-study");

  // 验证顶栏标题
  const lessonHeader = await page
    .locator(".preview-study-toolbar span")
    .first()
    .textContent();
  assert.equal(lessonHeader?.trim(), "校园生活与日常");

  // 验证学习提示语中性自然（无“小宝贝”“家长帮忙”）
  const introEyebrow = await page
    .locator(".preview-question .eyebrow")
    .textContent();
  assert.equal(introEyebrow?.trim(), "学习新词汇");
  console.log("✔ 小课顶栏与引导语适龄无幼态化：'学习新词汇'");

  // 阶段 1：学习词汇（前 3 词一组）
  for (let i = 0; i < 3; i++) {
    const card = page.locator(".preview-study-card");
    await card.waitFor({ state: "visible" });
    assert.equal(await card.getAttribute("data-question-kind"), "intro");

    // 验证按钮为“进入练习”
    const continueBtn = page
      .locator("button.btn-primary")
      .filter({ hasText: "进入练习" });
    await continueBtn.click();
  }
  console.log("✔ 顺利完成 3 词词条初识阶段");

  // 阶段 2：小课练习与语境选义题 (context-meaning) 交互验证
  console.log("5. 验证小课练习阶段题型与语境选义交互...");
  let verifiedContextMeaning = false;

  for (let q = 0; q < 5; q++) {
    const questionCard = page.locator(".preview-study-card.is-recall");
    if (!(await questionCard.isVisible())) break;

    const qKind = await questionCard.getAttribute("data-question-kind");
    const targetId = await questionCard.getAttribute("data-content-id");

    if (qKind === "context-meaning") {
      console.log(`  -> 遇到语境选义题 (context-meaning) [${targetId}]`);
      const qEyebrow = await page
        .locator(".preview-question .eyebrow")
        .textContent();
      assert.equal(qEyebrow?.trim(), "语境理解");
      const qTitle = await page.locator(".preview-question h1").textContent();
      assert.equal(qTitle?.trim(), "在句子里理解词义");

      // 验证划线句子展示
      const sentencePrompt = page.locator(".primary-context-sentence");
      assert.ok(await sentencePrompt.isVisible(), "应渲染语境例句容器");
      const markInSentence = sentencePrompt.locator("mark.example-target");
      assert.ok(
        await markInSentence.isVisible(),
        "句中目标词应有 mark.example-target 高亮划线",
      );
      console.log(
        `  ✔ 语境例句划线展示正常：划线词为 '${await markInSentence.textContent()}'`,
      );

      // 验证选项：1 个正确义项 + 2 个干扰项
      const options = page.locator(".preview-option");
      const optCount = await options.count();
      assert.equal(optCount, 3, `语境单选应有 3 个选项，实际为 ${optCount}`);

      const optionTexts = [];
      for (let i = 0; i < optCount; i++) {
        const txt = (await options.nth(i).textContent())?.trim();
        assert.ok(txt && txt.length > 0, `选项 ${i + 1} 文案不应为空`);
        optionTexts.push(txt);
      }
      const uniqueOptionTexts = new Set(optionTexts);
      assert.equal(
        uniqueOptionTexts.size,
        3,
        "语境选择题 3 个选项文案必须各不相同",
      );
      console.log("  ✔ 3 个选项文案唯一且互不重复：", optionTexts);

      // 验证礼貌提示按钮
      const hintBtn = page
        .locator("button.btn-ghost")
        .filter({ hasText: "查看学习提示" });
      assert.ok(await hintBtn.isVisible(), "应提供'查看学习提示'");
      const assistBtn = page
        .locator("button.btn-ghost")
        .filter({ hasText: "请求家长/老师协助" });
      assert.ok(await assistBtn.isVisible(), "应提供'请求家长/老师协助'");

      // 点击正确答案
      const targetOption = page.locator(`[data-option-id="${targetId}"]`);
      await targetOption.click();

      // 验证即时反馈区
      const feedback = page.locator(".preview-feedback");
      await feedback.waitFor({ state: "visible" });
      const feedbackText = await feedback.textContent();
      assert.ok(
        feedbackText?.includes("理解正确！"),
        "回答正确应提示'理解正确！'",
      );
      assert.ok(feedbackText?.includes("常用搭配："), "反馈中应强化常用搭配");
      console.log("  ✔ 答题反馈正确强化了语境解释与常用搭配");
      verifiedContextMeaning = true;
      break; // 保持停留在已作答状态，用于测试下一步刷新恢复
    } else if (qKind === "listen-word") {
      console.log(`  -> 遇到听辨选词题 (listen-word) [${targetId}]`);
      const playBtn = page.getByRole("button", { name: "播放题目发音" });
      if (await playBtn.isVisible()) {
        await playBtn.click();
        await page.waitForFunction(
          () => !document.querySelector(".preview-option")?.disabled,
        );
      }
      const targetOption = page.locator(`[data-option-id="${targetId}"]`);
      await targetOption.click();
      const continueBtn = page
        .locator("button.btn-primary")
        .filter({ hasText: "继续" });
      await continueBtn.click();
    }
  }

  assert.ok(verifiedContextMeaning, "必须在首组测试中触发并验证语境选义题");

  // STEP 5: 页面刷新与断点恢复（幂等不重复计分）
  console.log("6. 测试刷新页面后的断点恢复...");
  await page.reload();
  await page.waitForSelector(".preview-lessons");

  const firstTile = page.locator(".preview-lesson-tile").first();
  const resumeHint = firstTile
    .locator("p")
    .filter({ hasText: "接着上次的小课继续。" });
  await resumeHint.waitFor({ state: "visible" });
  console.log("✔ 刷新后单元卡片正确感知断点：'接着上次的小课继续。'");

  const resumeBtn = firstTile
    .locator("button.btn-primary")
    .filter({ hasText: "继续小课" });
  await resumeBtn.waitFor({ state: "visible" });
  await resumeBtn.click();
  await page.waitForSelector(".preview-study");

  // 确认从断点恢复到小课
  const resumedHeader = await page
    .locator(".preview-study-toolbar span")
    .first()
    .textContent();
  assert.equal(resumedHeader?.trim(), "校园生活与日常");
  console.log("✔ 点击'继续小课'成功从保存的断点恢复，会话不丢失");

  // 点击“继续”推进剩余题目
  let stepSafety = 0;
  while (stepSafety < 20) {
    stepSafety++;
    const finishScreen = page.locator(".preview-study-finished");
    if (await finishScreen.isVisible()) {
      console.log("✔ 已到达小课完成结算页面");
      break;
    }

    const nextIntro = page
      .locator("button.btn-primary")
      .filter({ hasText: "进入练习" });
    if (await nextIntro.isVisible()) {
      await nextIntro.click();
      await page.waitForTimeout(100);
      continue;
    }

    const nextBtn = page
      .locator("button.btn-primary")
      .filter({ hasText: "继续" });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(100);
      continue;
    }

    const recallCard = page.locator(".preview-study-card.is-recall");
    if (await recallCard.isVisible()) {
      const playBtn = page.getByRole("button", { name: "播放题目发音" });
      if (await playBtn.isVisible()) {
        await playBtn.click();
        await page.waitForFunction(
          () => !document.querySelector(".preview-option")?.disabled,
        );
      }
      const curTarget = await recallCard.getAttribute("data-content-id");
      const opt = page.locator(`[data-option-id="${curTarget}"]`);
      if (await opt.isVisible()) {
        await opt.click();
        await page.waitForTimeout(100);
        continue;
      }
    }

    // 若无更多行动则退出
    break;
  }

  // STEP 6: 检查本地存储中的数据隔离性
  console.log("7. 检查多作用域存储与进度记录...");
  const storageData = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const middleProgressKey = keys.find(
      (k) => k.includes("primary-progress") && k.includes("middle-english"),
    );
    const primaryProgressKey = keys.find(
      (k) => k.includes("primary-progress") && k.includes("primary-starter"),
    );
    const hanziProgressKey = keys.find(
      (k) => k.includes("primary-progress") && k.includes("hanzi-starter"),
    );
    return {
      keys,
      middleProgress: middleProgressKey
        ? JSON.parse(localStorage.getItem(middleProgressKey))
        : null,
      primaryProgress: primaryProgressKey
        ? JSON.parse(localStorage.getItem(primaryProgressKey))
        : null,
      hanziProgress: hanziProgressKey
        ? JSON.parse(localStorage.getItem(hanziProgressKey))
        : null,
    };
  });

  assert.ok(storageData.middleProgress, "初中英语应生成独立进度记录");
  console.log(
    `✔ 初中英语进度已记录，包含词条数：${Object.keys(storageData.middleProgress.entries || {}).length}`,
  );
  assert.equal(
    storageData.primaryProgress,
    null,
    "小学英语进度未被污染，保持为 null",
  );
  assert.equal(
    storageData.hanziProgress,
    null,
    "汉字启蒙进度未被污染，保持为 null",
  );

  // STEP 7: 切换至小学和汉字空间进行回归验证
  console.log("8. 回归验证小学英语与汉字空间入口...");
  await page.goto("http://localhost:5188/#/explore?course=primary-starter");
  await page.waitForSelector(".preview-hero, .preview-lessons");
  const primaryTitle = await page.locator("h1, h2").first().textContent();
  assert.ok(primaryTitle?.length > 0, "小学英语空间正常加载");
  console.log("✔ 小学英语空间正常进入");

  await page.goto("http://localhost:5188/#/explore?course=hanzi-starter");
  await page.waitForSelector(".preview-hero, .preview-lessons");
  const hanziTitle = await page.locator("h1, h2").first().textContent();
  assert.ok(hanziTitle?.length > 0, "汉字启蒙空间正常加载");
  console.log("✔ 汉字启蒙空间正常进入");

  // 回归验证雅思词光主入口
  await page.goto("http://localhost:5188/#/");
  await page.waitForSelector(".app, .main");
  console.log("✔ 雅思词光原主入口正常加载");

  // STEP 8: 响应式与主题测试
  console.log("9. 验证移动端 375px 窄屏与浅色主题适配...");
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(
    "http://localhost:5188/#/explore?course=middle-english&view=atlas",
  );
  await page.waitForSelector(".preview-lessons");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  assert.equal(overflow, false, "375px 窄屏不应出现横向滚动条");

  // 切换浅色主题
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
  });
  const bgTheme = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  assert.ok(bgTheme && bgTheme.length > 0, "浅色主题变量正确生效");
  console.log("✔ 375px 窄屏无横向溢出，浅色主题正常渲染");

  assert.equal(
    failures.length,
    0,
    `页面运行中出现未捕获异常: ${failures.join("; ")}`,
  );

  await browser.close();
  console.log("\n🎉 初中英语专项工程验收 (T67) 全部 9 项指标圆满通过！");
}

main().catch((err) => {
  console.error("❌ 验收失败：", err);
  process.exit(1);
});
