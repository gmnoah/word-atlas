/** Portable smoke checks; each engine runs in an isolated synthetic context. */
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";

const base = process.env.PREVIEW_URL || "http://127.0.0.1:5199/";
const engineName = process.env.BROWSER_ENGINE || "chromium";
const engines = { chromium, firefox, webkit };
if (!Object.hasOwn(engines, engineName)) throw new Error("BROWSER_ENGINE must be chromium, firefox or webkit");
const launchOptions = engineName === "chromium" ? { headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" } : { headless: true };
const browser = await engines[engineName].launch(launchOptions);
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: "block" });
  await context.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      getVoices: () => [], cancel() {}, addEventListener() {}, removeEventListener() {},
    } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}#/explore`);
  await page.getByRole("heading", { name: "选择你的学习旅程" }).waitFor();
  assert.equal(await page.locator(".preview-space-grid [data-course-id]").count(), 3);
  await page.getByRole("button", { name: "探索基础英语" }).click();
  await page.getByRole("heading", { name: "基础英语", exact: true }).waitFor();
  assert.equal(await page.locator(".preview-lesson-tile").count(), 33);
  await page.getByRole("button", { name: "开始小课", exact: true }).first().click();
  await page.getByRole("heading", { name: "看看这位新朋友" }).waitFor();
  const englishImage = page.locator(".preview-study-card .illo img");
  await englishImage.waitFor();
  await page.waitForFunction(() => document.querySelector(".preview-study-card .illo img")?.naturalWidth > 0);
  assert.ok(await englishImage.evaluate((image) => image.getBoundingClientRect().width > 100));
  await page.getByRole("button", { name: "返回主题" }).click();
  await page.getByRole("button", { name: "结束体验" }).click();
  await page.getByRole("heading", { name: "基础英语", exact: true }).waitFor();
  await page.goto(`${base}#/explore?course=hanzi-starter`);
  await page.getByRole("heading", { name: "汉字启蒙", exact: true }).waitFor();
  assert.equal(await page.locator(".hanzi-map-stop").count(), 32);
  await page.locator(".hanzi-map-stop").first().getByRole("button", { name: "只读一读" }).click();
  await page.getByRole("heading", { name: "一个字，一个小发现" }).waitFor();
  const hanziImage = page.locator(".hanzi-study-card .illo img");
  await page.waitForFunction(() => document.querySelector(".hanzi-study-card .illo img")?.naturalWidth > 0);
  assert.ok(await hanziImage.evaluate((image) => image.getBoundingClientRect().width > 100));
  await page.getByRole("button", { name: /朗读词语/ }).click();
  await page.getByText("暂时无法播放，可以重试，也可以请家长读一读。").waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const toggle = page.getByRole("button", { name: /切换到(深|浅)色/ });
  await toggle.click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ engine: engineName, browserVersion: browser.version(), viewport: "375x812 and 1440x900", result: "passed", scope: "isolated context; no Mandarin voice; English/Hanzi course, images, exit, fallback and themes" }, null, 2));
} finally { await browser.close(); }
