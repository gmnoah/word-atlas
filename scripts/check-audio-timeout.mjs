/** Simulate a stalled media play promise, then retry with the actual audio. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.env.PREVIEW_URL || "http://localhost:5188/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
try {
  const context = await browser.newContext();
  await context.addInitScript(() => { Date.now = () => 1000; });
  const page = await context.newPage();
  await page.goto(`${base}#/explore?course=primary-starter`);
  await page.getByRole("button", { name: "开始小课", exact: true }).first().click();
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "认识了，继续" }).click();
  assert.equal(await page.locator(".preview-study-card").getAttribute("data-question-kind"), "listen-word");
  await page.evaluate(() => {
    window.originalMediaPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = () => new Promise(() => {});
  });
  await page.getByRole("button", { name: "播放题目发音" }).click();
  await page.getByRole("button", { name: "停止朗读" }).click();
  assert.equal(await page.locator(".preview-option").first().isDisabled(), true);
  assert.equal(await page.getByText("暂时无法播放，可以重试，也可以请家长读一读。").count(), 0, "stopping is not a resource failure");
  await page.getByRole("button", { name: "播放题目发音" }).click();
  await page.getByText("暂时无法播放，可以重试，也可以请家长读一读。").waitFor({ timeout: 20000 });
  assert.equal(await page.locator(".preview-option").first().isDisabled(), true);
  await page.evaluate(() => { HTMLMediaElement.prototype.play = window.originalMediaPlay; });
  await page.getByRole("button", { name: "播放题目发音" }).click();
  await page.waitForFunction(() => !document.querySelector(".preview-option")?.disabled);
  console.log("Passed: stalled audio times out, does not score, and can be retried");
} finally { await browser.close(); }
