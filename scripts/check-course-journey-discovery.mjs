import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  headless: true,
  channel: process.env.PREVIEW_BROWSER || "chrome",
});

try {
  const spacesContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: "block",
  });
  try {
    const spacesPage = await spacesContext.newPage();
    await spacesPage.goto("http://localhost:5188/#/explore");
    await spacesPage.locator('[data-course-id="primary-starter"]').waitFor();
    assert.match(await spacesPage.locator(".preview-edition").innerText(), /学习空间\s*本机保存/);
    assert.equal(await spacesPage.getByText("体验版", { exact: true }).count(), 0);
    for (const [courseId, count, lessons] of [["primary-starter", 300, 33], ["hanzi-starter", 300, 32]]) {
      const meta = spacesPage.locator(`[data-course-id="${courseId}"] .preview-space-meta`);
      assert.match(await meta.innerText(), new RegExp(`${count} .+ · ${lessons} 个主题`));
      assert.doesNotMatch(await meta.innerText(), /待审校/);
    }
  } finally {
    await spacesContext.close();
  }

  for (const course of ["primary-starter", "hanzi-starter"]) {
    for (const width of [375, 800, 1280]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      await page.goto(
        `http://localhost:5188/#/explore?course=${course}&view=journey`,
      );
      const discovery = page.locator(".journey-discovery");
      await discovery.waitFor();
      assert.match(await page.locator(".preview-disclosure").last().innerText(), /课程内容持续审校中/);
      const chips = discovery.getByRole("button");
      assert.equal(await chips.count(), 4);
      assert.match(
        await discovery.locator(".journey-discovery-progress").innerText(),
        new RegExp(`已看过 0 / 300 个${course === "hanzi-starter" ? "字" : "词"}`),
      );
      const meter = discovery.locator(".journey-discovery-meter");
      assert.equal(await meter.getAttribute("value"), "0");
      assert.equal(await meter.getAttribute("max"), "5");
      assert.match(
        await meter.getAttribute("aria-label"),
        /已看过 0 \/ 5 个[词字]/,
      );
      const firstTheme = page.locator(".journey-stop").first();
      await firstTheme.waitFor();
      assert.equal(
        await firstTheme.locator(".journey-stop-preview li").count(),
        4,
      );
      assert.match(
        await firstTheme.locator(".journey-stop-preview li").first().innerText(),
        course === "hanzi-starter" ? /山\s*·\s*高山/ : /apple\s*·\s*苹果/,
      );
      assert.match(
        await firstTheme.locator(".journey-stop-preview-more").getAttribute("aria-label"),
        /另有 \d+ 个内容/,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.equal(
        await discovery
          .locator("li")
          .first()
          .evaluate((element) => getComputedStyle(element).animationName),
        "none",
      );

      await chips.first().click();
      const dialog = page.getByRole("dialog", { name: "课程条目" });
      await dialog.waitFor();
      await page.waitForFunction(() => !!document.activeElement?.closest("[role=dialog]"));
      assert.equal(
        await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")),
        true,
      );
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
      assert.equal(
        await page.evaluate(() => document.activeElement?.tagName),
        "BUTTON",
      );
      assert.equal(
        await page.evaluate(
          () => !!document.activeElement?.closest(".journey-discovery"),
        ),
        true,
      );

      await page.getByRole("button", { name: "切换到浅色" }).click();
      assert.equal(
        await page.evaluate(() => document.documentElement.dataset.theme),
        "light",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await context.close();
    }

    const motionContext = await browser.newContext({
      viewport: { width: 375, height: 900 },
      reducedMotion: "no-preference",
      serviceWorkers: "block",
    });
    const motionPage = await motionContext.newPage();
    await motionPage.goto(
      `http://localhost:5188/#/explore?course=${course}&view=journey`,
    );
    await motionPage.locator(".journey-discovery").waitFor();
    assert.equal(
      await motionPage
        .locator(".journey-discovery li")
        .first()
        .evaluate((element) => getComputedStyle(element).animationName),
      "journey-discovery-arrive",
    );
    await motionContext.close();

    const progressContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    const progressPage = await progressContext.newPage();
    await progressPage.goto(
      `http://localhost:5188/#/explore?course=${course}&view=journey`,
    );
    await progressPage.locator(".journey-discovery").waitFor();
    const firstLabel = await progressPage
      .locator(".journey-discovery strong")
      .first()
      .innerText();
    const heroActions = progressPage.locator(
      ".preview-hero .journey-actions",
    );
    await heroActions
      .getByRole("button", {
        name:
          course === "hanzi-starter" ? /一起读一读/ : /开始今日小课/,
      })
      .first()
      .click();
    await progressPage
      .getByRole("button", {
        name:
          course === "hanzi-starter" ? "看过啦，下一个" : "认识了，继续",
      })
      .click();
    await progressPage.getByRole("button", { name: "返回旅程" }).click();
    await progressPage.getByRole("button", { name: "结束本次学习" }).click();
    await progressPage.locator(".journey-discovery").waitFor();
    assert.notEqual(
      await progressPage
        .locator(".journey-discovery strong")
        .first()
        .innerText(),
      firstLabel,
    );
    assert.match(
      await progressPage
        .locator(".journey-discovery-progress")
        .innerText(),
      /已看过 1 \/ 300 个[词字]\s*·\s*本主题还有 4 个没看/,
    );
    const progressMeter = progressPage.locator(".journey-discovery-meter");
    assert.equal(await progressMeter.getAttribute("value"), "1");
    assert.equal(await progressMeter.getAttribute("max"), "5");
    await progressPage.goto("http://localhost:5188/#/explore");
    const courseCard = progressPage.locator(`[data-course-id="${course}"]`);
    await courseCard.waitFor();
    assert.match(
      await courseCard.innerText(),
      /已看过 1 \/ 300/,
    );
    assert.equal(
      await courseCard
        .getByRole("button", {
          name:
            course === "hanzi-starter"
              ? "继续旅程：汉字启蒙"
              : "继续旅程：基础英语",
        })
        .count(),
      1,
    );
    if (course === "primary-starter") {
      await progressPage.goto(
        "http://localhost:5188/#/explore?course=primary-starter&view=atlas",
      );
      const firstTheme = progressPage.locator(".preview-lesson-tile").first();
      await firstTheme.getByText("看过 1 / 5 个词").waitFor();
      const startSelect = firstTheme.getByLabel("水果篮子起始词");
      const optionValues = await startSelect.locator("option").evaluateAll((options) =>
        options.map((option) => option.value),
      );
      assert.notEqual(
        await startSelect.inputValue(),
        optionValues[0],
        "a returning learner should default to the next unseen word",
      );
    } else {
      await progressPage.evaluate(() => {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("word-atlas:v3:hanzi-session:")) localStorage.removeItem(key);
        }
      });
      const introduced = await progressPage.evaluate(() => {
        const key = Object.keys(localStorage).find((item) =>
          item.startsWith("word-atlas:v3:primary-progress:"),
        );
        return Object.keys(JSON.parse(localStorage.getItem(key)).introduced);
      });
      await progressPage.goto(
        "http://localhost:5188/#/explore?course=hanzi-starter&view=atlas",
      );
      const firstStop = progressPage.locator(".hanzi-map-stop").first();
      await firstStop.getByRole("button", { name: "只读一读" }).click();
      const studyCard = progressPage.locator(".hanzi-study-card");
      await studyCard.waitFor();
      assert.equal(
        introduced.includes(await studyCard.getAttribute("data-content-id")),
        false,
        "returning co-reading should start with a character the learner has not seen",
      );
    }
    await progressContext.close();
  }

  const context = await browser.newContext({
    viewport: { width: 800, height: 900 },
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  await page.goto("http://localhost:5188/#/explore");
  await page.locator(".preview-space-grid").waitFor();
  assert.equal(
    await page
      .locator(".preview-space-grid")
      .evaluate((element) =>
        getComputedStyle(element).gridTemplateColumns.split(" ").length,
      ),
    2,
  );
  assert.equal(
    await page
      .locator('[data-course-id="primary-starter"]')
      .getByRole("button", { name: "开始旅程：基础英语" })
      .count(),
    1,
  );
  await context.close();

  console.log(
    "两课程今日发现、主题进度、真实进度轮换、英语与汉字未看起点、学习空间续学状态、词字卡键盘开关、减少动态、375/800/1280px 与深浅主题通过；800px 学习空间为两列",
  );
} finally {
  await browser.close();
}
