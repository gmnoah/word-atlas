/** Isolated browser regression for the preschool draft recognition prompt. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.env.PREVIEW_URL || "http://127.0.0.1:5199/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: "block" });
  await context.addInitScript(() => { if (window.speechSynthesis) window.speechSynthesis.getVoices = () => []; });
  const page = await context.newPage();
  await page.goto(`${base}#/explore?course=hanzi-starter`);
  const group = page.locator(".hanzi-map-stop").filter({ has: page.getByRole("heading", { name: "颜色世界", exact: true }) });
  await group.getByRole("button", { name: "认一认" }).click();
  for (let i = 0; i < 5 && await page.locator(".hanzi-study-card.is-recall").count() === 0; i++) {
    await page.getByRole("button", { name: "认识了，继续" }).click();
  }
  const card = page.locator(".hanzi-study-card.is-recall");
  await card.waitFor();
  assert.equal(await card.getAttribute("data-question-kind"), "hanzi-question");
  assert.equal(await card.locator(".preview-study-art img").count(), 0, "a text question does not expose its target image");
  assert.ok(await card.getByText("和家长一起读题，再找一找。").isVisible());
  const prompt = await page.locator(".preview-question h1").innerText();
  assert.match(prompt, /^在“.+”里，找第.+个字。$/);
  assert.doesNotMatch(prompt, /□/);
  const target = await card.getAttribute("data-content-id");
  await card.locator(`[data-option-id="${target}"]`).click();
  assert.ok(await card.locator(`[data-option-id="${target}"]`).count());
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole("button", { name: "切换到浅色" }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log("Passed: draft Hanzi question uses a unique position; answer, 375px and both themes work.");
} finally { await browser.close(); }
