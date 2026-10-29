/** Browser checks use an isolated context and synthetic clock; no user data is accessed. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import fs from "node:fs/promises";

const base = process.env.PREVIEW_URL || "http://localhost:5188/";
await fs.mkdir("output/preview-check", { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await context.addInitScript(() => {
    const realNow = Date.now;
    Date.now = () => window.__questionTestSeed ?? realNow();
  });
  const page = await context.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  for (const [kind, seed] of [["listen-word", 1000], ["listen-picture", 1002], ["picture-word", 1003]]) {
    await page.goto(`${base}#/explore?course=primary-starter`);
    await page.reload();
    await page.getByRole("heading", { name: "基础英语", exact: true }).waitFor();
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("word-atlas:v3:primary-session:")).forEach((key) => localStorage.removeItem(key)));
    await page.evaluate((value) => { window.__questionTestSeed = value; }, seed);
    await page.getByRole("button", { name: "开始小课" }).first().click();
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "认识了，继续" }).click();
    const card = page.locator(".preview-study-card.is-recall");
    assert.equal(await card.getAttribute("data-question-kind"), kind);
    const target = await card.getAttribute("data-content-id");
    const options = page.locator(".preview-option");
    if (kind.startsWith("listen-")) {
      assert.equal(await options.first().isDisabled(), true, "a listening question is locked until audio plays");
      assert.equal(await page.getByRole("button", { name: "播放题目发音" }).count(), 1);
      if (kind === "listen-word") {
        await page.route("**/atlas/audio/uk/*.mp3*", (route) => route.abort());
        await page.getByRole("button", { name: "播放题目发音" }).click();
        await page.getByText("暂时无法播放，可以重试，也可以请家长读一读。").waitFor();
        assert.equal(await options.first().isDisabled(), true, "audio failure cannot be answered");
        await page.unroute("**/atlas/audio/uk/*.mp3*");
      }
      await page.getByRole("button", { name: "播放题目发音" }).click();
      await page.waitForFunction(() => !document.querySelector(".preview-option")?.disabled);
    }
    if (kind === "listen-picture") {
      assert.equal(await options.locator("img").count(), 2);
      assert.equal((await options.first().innerText()).trim(), "", "pictures must not reveal word labels");
    }
    if (kind !== "picture-word") {
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (await page.getByRole("button", { name: "切换到深色" }).count())
        await page.getByRole("button", { name: "切换到深色" }).click();
      await page.screenshot({ path: `output/preview-check/${kind}-desktop-dark.png`, animations: "disabled" });
      await page.getByRole("button", { name: "切换到浅色" }).click();
      await page.screenshot({ path: `output/preview-check/${kind}-desktop-light.png`, animations: "disabled" });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({ path: `output/preview-check/${kind}-mobile-light.png`, animations: "disabled" });
      await page.getByRole("button", { name: "切换到深色" }).click();
      await page.screenshot({ path: `output/preview-check/${kind}-mobile-dark.png`, animations: "disabled" });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator(`[data-option-id="${target}"]`).click();
    await page.getByText("找到了！").waitFor();
    assert.equal(await options.first().isDisabled(), true, "first answer is locked");
  }
  await page.goto(`${base}#/explore?course=primary-starter`);
  await page.reload();
  await page.getByRole("heading", { name: "基础英语", exact: true }).waitFor();
  await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("word-atlas:v3:primary-session:")).forEach((key) => localStorage.removeItem(key)));
  assert.equal(await page.getByLabel("试试拼写").count(), 0, "starter does not offer spelling");
  await page.getByRole("button", { name: /多认识一些/ }).click();
  assert.equal(await page.getByLabel("试试拼写").isChecked(), false, "spelling is opt-in");
  await page.getByLabel("试试拼写").check();
  await page.evaluate(() => { window.__questionTestSeed = 1000; });
  await page.getByRole("button", { name: "开始小课" }).first().click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "认识了，继续" }).click();
  assert.equal(await page.locator(".preview-study-card").getAttribute("data-question-kind"), "spell");
  assert.equal(await page.getByRole("button", { name: "确认答案" }).isDisabled(), true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (await page.getByRole("button", { name: "切换到深色" }).count()) await page.getByRole("button", { name: "切换到深色" }).click();
  await page.screenshot({ path: "output/preview-check/spelling-desktop-dark.png", animations: "disabled" });
  await page.getByRole("button", { name: "切换到浅色" }).click();
  await page.screenshot({ path: "output/preview-check/spelling-desktop-light.png", animations: "disabled" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: "output/preview-check/spelling-mobile-light.png", animations: "disabled" });
  await page.getByRole("button", { name: "切换到深色" }).click();
  await page.screenshot({ path: "output/preview-check/spelling-mobile-dark.png", animations: "disabled" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByLabel("输入英文单词").fill(" ORANGE ");
  await page.getByRole("button", { name: "确认答案" }).click();
  await page.getByText("找到了！").waitFor();
  assert.equal(await page.getByLabel("输入英文单词").isDisabled(), true);
  assert.equal(await page.getByRole("button", { name: "确认答案" }).count(), 0);
  assert.deepEqual(failures, []);
  console.log("Primary question checks passed: three choice types, opt-in spelling, audio failure/retry, answer locking and 375px layout");
  await context.close();
} finally {
  await browser.close();
}
