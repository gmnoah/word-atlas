/** Verify subject-level lazy loading in an isolated browser against Vite dev. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.env.PREVIEW_URL || "http://localhost:5188/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
try {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(`${base}#/explore`);
  await page.getByRole("heading", { name: "选择你的学习旅程" }).waitFor();
  assert.ok(!requests.some((url) => url.includes("/primary-full.ts") || url.includes("/hanzi-full.ts")), "the learning-space homepage does not preload courses");
  await page.goto(`${base}#/explore?course=primary-starter`);
  await page.getByRole("heading", { name: "基础英语", exact: true }).waitFor();
  assert.ok(requests.some((url) => url.includes("/primary-full.ts")));
  assert.ok(!requests.some((url) => url.includes("/hanzi-full.ts")));
  assert.ok(!requests.some((url) => url.includes("/atlas/index.json")));
  await page.goto(`${base}#/explore?course=hanzi-starter`);
  await page.getByRole("heading", { name: "汉字启蒙", exact: true }).waitFor();
  assert.ok(requests.some((url) => url.includes("/hanzi-full.ts")));
  console.log("Passed: primary loads without Hanzi or IELTS data; Hanzi loads when selected.");
} finally { await browser.close(); }
