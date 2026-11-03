import assert from "node:assert/strict";
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PREVIEW_BROWSER || "chrome",
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();

  // 1. 初始化设置和一条初中英语进度
  await context.addInitScript(() => {
    localStorage.setItem("word-atlas:settings", JSON.stringify({ theme: "dark", splash: false }));
    localStorage.setItem(
      "word-atlas:v3:primary-progress:learner-default:middle-english",
      JSON.stringify({
        version: 1,
        profileId: "learner-default",
        courseId: "middle-english",
        introduced: { "mid-grade": Date.now() },
        cards: {},
        favorites: ["mid-grade"],
        applied: {},
      })
    );
  });

  console.log("1. 打开初中英语页面并确认已有进度...");
  await page.goto("http://localhost:5188/#/explore?course=middle-english&view=atlas");
  await page.waitForSelector(".preview-lessons");

  const initialKey = await page.evaluate(() =>
    localStorage.getItem("word-atlas:v3:primary-progress:learner-default:middle-english")
  );
  assert.ok(initialKey, "初始状态下应存在初中英语学习进度");
  console.log("✔ 已确认初中英语初始进度存在");

  console.log("2. 打开家长设置弹层...");
  const parentBtn = page.locator("button").filter({ hasText: "家长设置" }).first();
  await parentBtn.click();
  await page.waitForSelector(".sheet .preview-parent");

  console.log("3. 检查重置分区与按钮展示...");
  const resetSection = page.locator(".family-reset");
  await resetSection.waitFor({ state: "visible" });

  const resetCurrentBtn = resetSection.locator("button").filter({ hasText: "重置「初中英语」记录" });
  await resetCurrentBtn.waitFor({ state: "visible" });
  const resetAllBtn = resetSection.locator("button").filter({ hasText: "清空全部课程记录" });
  await resetAllBtn.waitFor({ state: "visible" });
  console.log("✔ 重置分区与两级清理按钮展示完整：重置「初中英语」记录、清空全部课程记录");

  console.log("4. 点击重置「初中英语」记录并确认弹窗...");
  let dialogMessage = "";
  page.once("dialog", async (dialog) => {
    dialogMessage = dialog.message();
    console.log("✔ 捕获二次确认对话框：", dialogMessage);
    await dialog.accept();
  });

  await resetCurrentBtn.click();
  assert.ok(dialogMessage.includes("初中英语"), "对话框应明确说明重置对象为初中英语");

  // 等待 toast
  const toast = page.locator(".toast").first();
  await toast.waitFor({ state: "visible" });
  const toastText = await toast.textContent();
  assert.ok(toastText?.includes("已清空"), "应弹出清空成功提示");
  console.log("✔ 成功触发重置并提示：", toastText?.trim());

  console.log("5. 检查本地存储中的目标进度是否被彻底清除...");
  const afterKey = await page.evaluate(() =>
    localStorage.getItem("word-atlas:v3:primary-progress:learner-default:middle-english")
  );
  assert.equal(afterKey, null, "初中英语进度 key 应已被清空");
  console.log("✔ 本地初中英语学习进度已确认彻底删除归零");

  await browser.close();
  console.log("\n🎉 网站端可视化重置按钮与防误触确认验收全部通过！");
}

main().catch((err) => {
  console.error("❌ 验收失败：", err);
  process.exit(1);
});
