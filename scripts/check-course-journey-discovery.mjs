import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  headless: true,
  channel: process.env.PREVIEW_BROWSER || "chrome",
});

try {
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
      const chips = discovery.getByRole("button");
      assert.equal(await chips.count(), 4);
      assert.match(
        await discovery.locator(".journey-discovery-progress").innerText(),
        new RegExp(`已看过 0 / 300 个${course === "hanzi-starter" ? "字" : "词"}`),
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
  await context.close();

  console.log(
    "两课程今日发现、词字卡键盘开关、减少动态、375/800/1280px 与深浅主题通过；800px 学习空间为两列",
  );
} finally {
  await browser.close();
}
