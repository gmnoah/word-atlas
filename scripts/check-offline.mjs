/** Production build served from a temporary preview port; isolated browser only. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.env.PREVIEW_URL || "http://127.0.0.1:5199/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
try {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const register = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = async (...args) => { await caches.open("unrelated-app-cache"); return register(...args); };
  });
  const page = await context.newPage();
  await page.goto(`${base}#/explore?course=primary-starter`);
  await page.getByRole("heading", { name: "基础英语", exact: true }).waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  assert.ok((await page.evaluate(() => caches.keys())).includes("unrelated-app-cache"));
  const resource = "courses/primary-starter/0.4.0-draft/media/atlas/img/apple.webp";
  assert.equal(await page.evaluate(async (url) => (await fetch(url)).status, resource), 200);
  await page.waitForFunction(async (url) => !!(await caches.match(url)), resource);
  await context.setOffline(true);
  assert.equal(await page.evaluate(async (url) => (await fetch(url)).status, resource), 200);
  const missed = await page.evaluate(async () => {
    try { await fetch("courses/primary-starter/other-version/media/atlas/img/apple.webp"); return false; }
    catch { return true; }
  });
  assert.equal(missed, true, "uncached version must not be replaced by an old version");
  await page.reload();
  await page.getByRole("heading", { name: "基础英语", exact: true }).waitFor();
  await page.evaluate(() => { location.hash = "#/explore?course=hanzi-starter"; });
  await page.getByText("暂时没能打开").waitFor();
  await context.setOffline(false);
  await page.getByRole("button", { name: "回到学习空间" }).click();
  await page.getByRole("button", { name: "一起认汉字" }).click();
  await page.getByRole("heading", { name: "汉字启蒙", exact: true }).waitFor();
  console.log("Passed: cached course reload offline, uncached course error and online retry, version miss, unrelated cache retained");
} finally { await browser.close(); }
