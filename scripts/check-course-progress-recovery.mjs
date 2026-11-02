import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });

try {
  for (const course of ["primary-starter", "hanzi-starter"]) {
    for (const width of [375, 1280]) {
      for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
        await context.addInitScript(theme => {
          localStorage.setItem("word-atlas:settings", JSON.stringify({ theme, onboarded: true, splash: false }));
        }, theme);
        const page = await context.newPage();
        const key = `word-atlas:v3:primary-progress:learner-default:${course}`;
        await page.goto(`http://localhost:5188/#/explore?course=${course}&view=journey`);
        await page.evaluate(key => localStorage.setItem(key, "{damaged"), key);
        await page.reload();

        const discovery = page.locator(".journey-discovery");
        await discovery.getByText("学习记录暂时无法读取。").waitFor();
        const progressRecovery = page.locator(".journey-progress-recovery");
        await progressRecovery.getByText(course === "hanzi-starter"
          ? "学习记录暂时无法读取，仍可浏览词字；请先恢复记录再开始新的学习。"
          : "学习进度暂时无法读取，原记录已保留。").waitFor();
        const recoveryButton = progressRecovery.getByRole("button", { name: "打开家长设置" });
        assert.equal(await recoveryButton.evaluate(element => element.getBoundingClientRect().height >= 48), true);
        await recoveryButton.click();
        const dialog = page.getByRole("dialog", { name: "家长设置" });
        await dialog.getByText("备份与恢复").waitFor();
        await dialog.getByRole("button", { name: "关闭" }).click();
        assert.equal(await recoveryButton.evaluate(element => document.activeElement === element), true);
        const blockedStarts = page.locator(".journey-stop").getByRole("button", { name: "学习记录待恢复" });
        assert.ok(await blockedStarts.count() > 0);
        for (let index = 0; index < await blockedStarts.count(); index += 1) {
          assert.equal(await blockedStarts.nth(index).isDisabled(), true);
        }

        if (course === "hanzi-starter") {
          const favorites = page.getByRole("region", { name: "收藏的字" });
          await favorites.getByText("收藏记录暂时无法读取，原记录已保留。").waitFor();
          const favoritesRecovery = favorites.getByRole("button", { name: "打开家长设置" });
          assert.equal(await favoritesRecovery.evaluate(element => element.getBoundingClientRect().height >= 48), true);
          await favoritesRecovery.click();
          await dialog.getByText("备份与恢复").waitFor();
          await dialog.getByRole("button", { name: "关闭" }).click();
          assert.equal(await favoritesRecovery.evaluate(element => document.activeElement === element), true);
        }

        const galaxySection = page.locator(".course-galaxy-section");
        if (!await galaxySection.evaluate(element => element.open)) await galaxySection.locator("summary").click();
        const galaxy = page.getByRole("region", { name: "课程知识星图" });
        await galaxy.getByText("学习记录暂时无法读取，仍可从主题列表浏览词字；原记录已保留。").waitFor();
        const galaxyRecovery = galaxy.getByRole("button", { name: "打开家长设置" });
        assert.equal(await galaxyRecovery.evaluate(element => element.getBoundingClientRect().height >= 48), true);
        await galaxyRecovery.click();
        await dialog.getByText("备份与恢复").waitFor();
        await dialog.getByRole("button", { name: "关闭" }).click();
        assert.equal(await galaxyRecovery.evaluate(element => document.activeElement === element), true);

        await page.getByRole("button", { name: "主题图鉴", exact: true }).click();
        if (course === "hanzi-starter") {
          const mapRecovery = page.locator(".hanzi-map-recovery");
          await mapRecovery.getByText("学习记录暂时无法读取，仍可打开字卡看看；请先恢复记录再开始共读或认读。").waitFor();
          const mapRecoveryButton = mapRecovery.getByRole("button", { name: "打开家长设置" });
          assert.equal(await mapRecoveryButton.evaluate(element => element.getBoundingClientRect().height >= 48), true);
          const mapStarts = page.locator(".hanzi-map-actions").getByRole("button", { name: "学习记录待恢复" });
          assert.ok(await mapStarts.count() > 0);
          for (let index = 0; index < await mapStarts.count(); index += 1) {
            assert.equal(await mapStarts.nth(index).isDisabled(), true);
          }
          await mapRecoveryButton.click();
          await dialog.getByText("备份与恢复").waitFor();
          await dialog.getByRole("button", { name: "关闭" }).click();
          assert.equal(await mapRecoveryButton.evaluate(element => document.activeElement === element), true);
        } else {
          const blockedAtlasStarts = page.locator(".preview-lessons").getByRole("button", { name: "学习记录待恢复" });
          assert.ok(await blockedAtlasStarts.count() > 0);
          for (let index = 0; index < await blockedAtlasStarts.count(); index += 1) {
            assert.equal(await blockedAtlasStarts.nth(index).isDisabled(), true);
          }
        }

        const browseButton = page.locator(course === "hanzi-starter" ? ".hanzi-entry-link" : ".preview-entry-link").first();
        await browseButton.click();
        const entryDialog = page.getByRole("dialog", { name: "课程条目" });
        await entryDialog.getByText("收藏记录暂时无法读取，原记录已保留。").waitFor();
        const inlineRecovery = entryDialog.getByRole("button", { name: "打开家长设置" });
        await page.waitForTimeout(350);
        const inlineRecoveryRect = await inlineRecovery.evaluate(element => element.getBoundingClientRect().toJSON());
        assert.equal(inlineRecoveryRect.height >= 47.9, true,
          `${course}/${width}/${theme} 的词卡恢复入口应至少 48px：${JSON.stringify(inlineRecoveryRect)}`);
        await inlineRecovery.click();
        await dialog.getByText("备份与恢复").waitFor();
        await dialog.getByRole("button", { name: "关闭" }).click();
        assert.equal(await entryDialog.count(), 0);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), "{damaged");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await context.close();
      }
    }
  }
  console.log("两门课程旅程、收藏、知识星图与图鉴损坏记录恢复入口及启动保护通过");
} finally {
  await browser.close();
}
