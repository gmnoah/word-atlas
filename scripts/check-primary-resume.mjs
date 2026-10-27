/** Isolated browser context; never opens a user's browser profile. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import fs from "node:fs/promises";

const base = process.env.PREVIEW_URL || "http://localhost:5188/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
await fs.mkdir("output/preview-check", { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => { Date.now = () => 1003; });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}#/explore?course=primary-starter`);
  await page.getByRole("button", { name: "开始小课" }).first().click();
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "认识了，继续" }).click();
  const card = page.locator(".preview-study-card");
  assert.equal(await card.getAttribute("data-question-kind"), "picture-word");
  const target = await card.getAttribute("data-content-id");
  await page.locator(`[data-option-id="${target}"]`).click();
  await page.getByText("找到了！").waitFor();
  await page.waitForFunction(() => Object.keys(localStorage).some((key) => key.startsWith("word-atlas:v3:primary-session:") && Object.keys(JSON.parse(localStorage.getItem(key)).session.attempts).length === 1));
  await page.waitForFunction((id) => Object.keys(localStorage).some((key) => key.startsWith("word-atlas:v3:primary-progress:") && JSON.parse(localStorage.getItem(key)).cards[id]?.reps === 1), target);
  await page.reload();
  await page.getByRole("button", { name: "开始小课" }).first().click();
  await page.getByText("找到了！").waitFor();
  assert.equal(await page.evaluate((id) => { const key = Object.keys(localStorage).find((k) => k.startsWith("word-atlas:v3:primary-progress:")); return JSON.parse(localStorage.getItem(key)).cards[id].reps; }, target), 1);
  assert.equal(await page.locator(".preview-option").first().isDisabled(), true);
  await page.screenshot({ path: "output/preview-check/resume-desktop-dark.png", animations: "disabled" });
  await page.getByRole("button", { name: "切换到浅色" }).click();
  await page.screenshot({ path: "output/preview-check/resume-desktop-light.png", animations: "disabled" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: "output/preview-check/resume-mobile-light.png", animations: "disabled" });
  await page.getByRole("button", { name: "切换到深色" }).click();
  await page.screenshot({ path: "output/preview-check/resume-mobile-dark.png", animations: "disabled" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("button", { name: "返回主题" }).click();
  await page.getByRole("button", { name: "结束体验" }).click();
  await page.getByRole("button", { name: "开始小课" }).first().click();
  assert.notEqual(await page.locator(".preview-study-card").getAttribute("data-content-id"), target);
  assert.deepEqual(errors, []);
  console.log("Passed: answer lock after reload, pause/resume, desktop/mobile and both themes, no page errors");
} finally { await browser.close(); }
