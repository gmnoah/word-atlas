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
    await detail.getByRole("button", { name: "收藏这个词" }).click();
    await detail.getByRole("button", { name: "已收藏" }).waitFor();
    assert.equal(await detail.getByRole("button", { name: "已收藏" }).getAttribute("aria-pressed"), "true");
    const nextEnglish = detail.getByRole("button", { name: "下一词" });
    await page.waitForTimeout(350);
    const nextBox = await nextEnglish.boundingBox();
    assert.ok(nextBox && nextBox.width >= 48 && nextBox.height >= 48, `下一词入口至少 48px：${JSON.stringify(nextBox)}`);
    await nextEnglish.click();
    await detail.getByRole("heading", { name: "banana", exact: true }).waitFor();
    await detail.getByText("水果篮子 · 第 2 / 5 个词").waitFor();
    await detail.getByRole("button", { name: "收藏这个词" }).waitFor();
    assert.equal(await page.evaluate(() => location.hash.includes("entry=en-banana")), true);
    await detail.getByRole("button", { name: "关闭" }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "查看 apple 词卡");
    await page.goBack();
    await page.getByRole("heading", { name: "水果篮子" }).waitFor();
    assert.equal(await page.getByRole("dialog", { name: "课程条目" }).count(), 0);
    assert.equal(await page.evaluate(async () => {
      const progress = await import("/src/learning/primary-progress.ts");
      const ok = await progress.withPrimaryLock("learner-default", "primary-starter", () => {
        const current = progress.readPrimaryProgress(localStorage, "learner-default", "primary-starter");
        if (!current.ok) return false;
        let next = current.progress;
        for (const id of ["en-banana", "en-cat"]) next = progress.togglePrimaryFavorite(next, id);
        return progress.writePrimaryProgress(localStorage, next);
      });
      if (ok) window.dispatchEvent(new Event("primary-progress-changed"));
      return ok;
    }), true);
    await page.goto("http://localhost:5188/#/explore?course=primary-starter&view=journey");
    const englishJourney = page.getByRole("region", { name: "今日学习" });
    assert.equal(await englishJourney.locator(".primary-favorites-count").textContent(), "3");
    await englishJourney.getByRole("button", { name: "打开 apple 词卡" }).click();
    detail = page.getByRole("dialog", { name: "课程条目" });
    await detail.getByRole("heading", { name: "apple", exact: true }).waitFor();
    await detail.getByRole("button", { name: "关闭" }).click();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "打开 apple 词卡");
    await englishJourney.getByRole("button", { name: "取消收藏 banana" }).click();
    await englishJourney.getByRole("button", { name: "打开 banana 词卡" }).waitFor({ state: "detached" });
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "打开 cat 词卡");

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
    await detail.getByRole("button", { name: "收藏这个字" }).click();
    await detail.getByRole("button", { name: "已收藏" }).waitFor();
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
    await detail.getByRole("button", { name: "关闭" }).click();
    await page.goto("http://localhost:5188/#/explore?course=hanzi-starter&view=journey");
    const favoriteOverview = page.getByRole("region", { name: "收藏的字" });
    await favoriteOverview.getByRole("button", { name: "打开 山 字卡" }).click();
    detail = page.getByRole("dialog", { name: "课程条目" });
    await detail.getByRole("heading", { name: "山", exact: true }).waitFor();
    await detail.getByRole("button", { name: "关闭" }).click();
    await favoriteOverview.getByRole("button", { name: "取消收藏 山" }).click();
    const emptyFavorites = favoriteOverview.getByText("还没有收藏的字。在词字卡里遇到喜欢的内容时，点一下收藏。");
    await emptyFavorites.waitFor();
    await page.waitForFunction(() => document.activeElement?.classList.contains("primary-favorites-empty"));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const hanziProgressKey = "word-atlas:v3:primary-progress:learner-default:hanzi-starter";
    await page.evaluate((key) => localStorage.setItem(key, "broken"), hanziProgressKey);
    await page.reload();
    await favoriteOverview.getByText("收藏记录暂时无法读取，原记录已保留。").waitFor();
    assert.equal(await favoriteOverview.getByText("收藏记录暂时无法读取，原记录已保留。").count(), 1);
    assert.equal(await favoriteOverview.getByText("收藏暂时无法保存，原记录已保留。").count(), 0);
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), hanziProgressKey), "broken");

    await context.close();
  }
  console.log("两课程词字卡连续浏览、图鉴收藏、收藏数量与取消焦点、英语与汉字收藏回看、朗读切换、返回历史及桌面/375px 深浅主题通过");
} finally {
  await browser.close();
}
