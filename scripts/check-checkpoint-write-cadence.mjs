/** Clock ticks must not rewrite local checkpoints every second. */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.PREVIEW_URL || "http://127.0.0.1:5188/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
try {
  for (const course of ["primary-starter", "hanzi-starter"]) {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    await context.addInitScript(() => {
      window.__checkpointWrites = 0;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith("word-atlas:v3:primary-session:") ||
          key.startsWith("word-atlas:v3:hanzi-session:")) window.__checkpointWrites += 1;
        return original.call(this, key, value);
      };
    });
    const page = await context.newPage();
    await page.goto(`${base}#/explore?course=${course}`);
    await page.getByRole("heading", {
      name: course === "primary-starter" ? "基础英语" : "汉字启蒙",
      exact: true,
    }).waitFor();
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("word-atlas:v3:primary-session:") ||
          key.startsWith("word-atlas:v3:hanzi-session:")) localStorage.removeItem(key);
      }
    });
    if (course === "primary-starter") {
      await page.getByRole("button", { name: "开始小课", exact: true }).first().click();
    } else {
      await page.locator(".hanzi-map-stop").first()
        .getByRole("button", { name: "只读一读", exact: true }).click();
    }
    await page.waitForFunction(() => window.__checkpointWrites >= 1);
    const idleBaseline = await page.evaluate(() => window.__checkpointWrites);
    await page.waitForTimeout(2_200);
    assert.equal(await page.evaluate(() => window.__checkpointWrites), idleBaseline,
      `${course} must not rewrite its checkpoint on each clock tick`);

    await page.getByRole("button", {
      name: course === "primary-starter" ? "认识了，继续" : "看过啦，下一个",
    }).click();
    await page.waitForFunction(
      (baseline) => window.__checkpointWrites > baseline,
      idleBaseline,
    );
    await context.close();
  }
  console.log("Passed: both courses save on durable learning changes, not every clock tick.");
} finally {
  await browser.close();
}
