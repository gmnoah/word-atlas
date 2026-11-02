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
        await discovery.getByText("学习记录暂时无法读取；仍可点开上面的词字看看。").waitFor();
        const discoveryRecovery = discovery.getByRole("button", { name: "打开家长设置" });
        assert.equal(await discoveryRecovery.evaluate(element => element.getBoundingClientRect().height >= 48), true);
        await discoveryRecovery.click();
        const dialog = page.getByRole("dialog", { name: "家长设置" });
        await dialog.getByText("备份与恢复").waitFor();
        await dialog.getByRole("button", { name: "关闭" }).click();
        assert.equal(await discoveryRecovery.evaluate(element => document.activeElement === element), true);

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
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), "{damaged");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await context.close();
      }
    }
  }
  console.log("两门课程旅程、收藏与知识星图的损坏记录恢复入口通过");
} finally {
  await browser.close();
}
