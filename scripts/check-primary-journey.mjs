import assert from "node:assert/strict";
import { chromium } from "playwright";
import fs from "node:fs/promises";
const base = process.env.PREVIEW_URL || "http://localhost:5188/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
await fs.mkdir("output/preview-check", { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => { Date.now = () => window.testNow ?? 1003; });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}#/explore?course=primary-starter`);
  await page.getByRole("button", { name: "开始小课", exact: true }).first().click();
  await page.getByRole("button", { name: "收藏这个词" }).click();
  await page.getByRole("button", { name: "已收藏" }).waitFor();
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "认识了，继续" }).click();
  const card = page.locator(".preview-study-card");
  const target = await card.getAttribute("data-content-id");
  assert.equal(await card.getAttribute("data-question-kind"), "picture-word");
  await page.locator(`[data-option-id="${target}"]`).click();
  await page.getByText("找到了！").waitFor();
  await page.waitForFunction((id) => Object.keys(localStorage).some((key) => key.startsWith("word-atlas:v3:primary-progress:") && JSON.parse(localStorage.getItem(key)).cards[id]?.reps === 1), target);
  await page.getByRole("button", { name: "返回主题" }).click();
  await page.getByRole("button", { name: "结束体验" }).click();
  await page.getByText("apple · 苹果").waitFor();
  await page.screenshot({ path: "output/preview-check/journey-desktop-dark.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "切换到浅色" }).click();
  await page.screenshot({ path: "output/preview-check/journey-desktop-light.png", fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: "output/preview-check/journey-mobile-light.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "切换到深色" }).click();
  await page.screenshot({ path: "output/preview-check/journey-mobile-dark.png", fullPage: true, animations: "disabled" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => { window.testNow = 1003 + 86_400_000; });
  await page.getByRole("button", { name: "开始今日小课" }).click();
  const checkpoint = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith("word-atlas:v3:primary-session:") && k.endsWith(":today"));
    return key && JSON.parse(localStorage.getItem(key));
  });
  // Wait for the async save if React has not committed it yet.
  if (!checkpoint) await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith("word-atlas:v3:primary-session:") && k.endsWith(":today")));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("word-atlas:v3:primary-session:") && k.endsWith(":today")))));
  assert.ok(saved.session.reviewIds.includes(target), "next-day session includes the previously answered word");
  assert.ok(saved.session.steps[0].kind !== "intro", "review comes before fresh words");
  const second = await context.newPage();
  await second.goto(`${base}#/explore?course=primary-starter`);
  const updateFavorite = (id) => page => page.evaluate(async (contentId) => {
    const m = await import("/src/learning/primary-progress.ts");
    return m.withPrimaryLock("learner-default", "primary-starter", () => {
      const current = m.readPrimaryProgress(localStorage, "learner-default", "primary-starter");
      if (!current.ok) return false;
      return m.writePrimaryProgress(localStorage, m.togglePrimaryFavorite(current.progress, contentId));
    });
  }, id);
  assert.deepEqual(await Promise.all([updateFavorite("en-cat")(page), updateFavorite("en-dog")(second)]), [true, true]);
  const favorites = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("word-atlas:v3:primary-progress:")))).favorites);
  assert.ok(favorites.includes("en-cat") && favorites.includes("en-dog") && favorites.includes("en-apple"));
  assert.deepEqual(errors, []);
  console.log("Passed: favorites, next-day due review first, concurrent tabs, desktop/mobile themes and no page errors");
} finally { await browser.close(); }
