/** An unreadable backup-generation marker must not crash a child lesson. */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.PREVIEW_URL || "http://127.0.0.1:5188/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
try {
  for (const course of ["primary-starter", "hanzi-starter"]) {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    await context.addInitScript(() => {
      const original = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key === "word-atlas:restore-generation") {
          throw new DOMException("test denied", "SecurityError");
        }
        return original.call(this, key);
      };
    });
    const page = await context.newPage();
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto(`${base}#/explore?course=${course}`);
    await page.getByRole("heading", {
      name: course === "primary-starter" ? "基础英语" : "汉字启蒙",
      exact: true,
    }).waitFor();
    if (course === "primary-starter") {
      await page.getByRole("button", { name: "开始小课", exact: true }).first().click();
      await page.getByRole("button", { name: "认识了，继续", exact: true }).waitFor();
    } else {
      await page.locator(".hanzi-map-stop").first()
        .getByRole("button", { name: "只读一读", exact: true }).click();
      await page.getByRole("button", { name: "看过啦，下一个", exact: true }).waitFor();
    }
    await page.waitForFunction(() =>
      Object.keys(localStorage).some((key) =>
        key.startsWith("word-atlas:v3:primary-session:") ||
        key.startsWith("word-atlas:v3:hanzi-session:")),
    );
    assert.deepEqual(failures, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
  }
  console.log("Passed: a denied restore-marker read does not block either child lesson.");
} finally {
  await browser.close();
}
