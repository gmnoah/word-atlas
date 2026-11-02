import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
try {
  for (const width of [375, 1280]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
    await context.addInitScript((selectedTheme) => {
      localStorage.setItem("word-atlas:settings", JSON.stringify({ theme: selectedTheme, onboarded: true, splash: false }));
      window.__voiceCancels = 0;
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          getVoices: () => [{ name: "test Mandarin", lang: "zh-CN" }],
          speak: () => {},
          cancel: () => { window.__voiceCancels += 1; },
          addEventListener: () => {},
          removeEventListener: () => {},
        },
      });
      window.SpeechSynthesisUtterance = class {
        constructor(text) { this.text = text; }
      };
    }, theme);
    const page = await context.newPage();

    await page.goto("http://localhost:5188/#/explore?course=primary-starter&view=atlas");
    await page.getByRole("button", { name: "查看 apple 词卡" }).first().click();
    let detail = page.getByRole("dialog", { name: "课程条目" });
    await detail.getByRole("heading", { name: "apple", exact: true }).waitFor();
    await detail.getByText("水果篮子 · 第 1 / 5 个词").waitFor();
    assert.equal(await detail.getByRole("button", { name: "上一词" }).isDisabled(), true);
    const nextEnglish = detail.getByRole("button", { name: "下一词" });
    await page.waitForTimeout(350);
    const nextBox = await nextEnglish.boundingBox();
    assert.ok(nextBox && nextBox.width >= 48 && nextBox.height >= 48, `下一词入口至少 48px：${JSON.stringify(nextBox)}`);
    await nextEnglish.click();
    await detail.getByRole("heading", { name: "banana", exact: true }).waitFor();
    await detail.getByText("水果篮子 · 第 2 / 5 个词").waitFor();
    assert.equal(await page.evaluate(() => location.hash.includes("entry=en-banana")), true);
    await detail.getByRole("button", { name: "关闭" }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "查看 apple 词卡");
    await page.goBack();
    await page.getByRole("heading", { name: "水果篮子" }).waitFor();
    assert.equal(await page.getByRole("dialog", { name: "课程条目" }).count(), 0);

    await page.goto("http://localhost:5188/#/explore?course=primary-starter&view=journey&entry=en-apple");
    detail = page.getByRole("dialog", { name: "课程条目" });
    await detail.getByRole("button", { name: "下一词" }).click();
    await detail.getByRole("heading", { name: "banana", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => location.hash.includes("view=journey")), true);
    await detail.getByRole("button", { name: "关闭" }).click();

    await page.goto("http://localhost:5188/#/explore?course=hanzi-starter&view=atlas");
    await page.getByRole("button", { name: "查看山字卡" }).first().click();
    detail = page.getByRole("dialog", { name: "课程条目" });
    await detail.getByRole("heading", { name: "山", exact: true }).waitFor();
    await detail.getByText("山水之间 · 第 1 / 5 个字").waitFor();
    assert.equal(await detail.getByRole("button", { name: "上一字" }).isDisabled(), true);
    await detail.getByRole("button", { name: "朗读 高山" }).click();
    await detail.getByRole("button", { name: "停止朗读" }).waitFor();
    const beforeCancel = await page.evaluate(() => window.__voiceCancels);
    await detail.getByRole("button", { name: "下一字" }).click();
    await detail.getByRole("heading", { name: "水", exact: true }).waitFor();
    await detail.getByRole("button", { name: "朗读 清水" }).waitFor();
    assert.ok(await page.evaluate(() => window.__voiceCancels) > beforeCancel, "切字时停止旧朗读");
    await detail.getByRole("button", { name: "下一字" }).click();
    await detail.getByRole("button", { name: "下一字" }).click();
    await detail.getByRole("button", { name: "下一字" }).click();
    await detail.getByText("山水之间 · 第 5 / 5 个字").waitFor();
    assert.equal(await detail.getByRole("button", { name: "下一字" }).isDisabled(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

    await context.close();
  }
  console.log("两课程词字卡主题内连续浏览、首尾禁用、朗读切换、返回历史及桌面/375px 深浅主题通过");
} finally {
  await browser.close();
}
