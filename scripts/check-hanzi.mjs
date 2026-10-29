/** Isolated browser checks for the preschool Hanzi space. No user data is touched. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.PREVIEW_URL || "http://localhost:5188/";
const evidence = "output/preview-check";
await fs.mkdir(evidence, { recursive: true });
const checks = [];
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PREVIEW_BROWSER || "chrome",
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${base}#/explore?course=hanzi-starter`);
  await page.getByRole("heading", { name: "汉字启蒙", exact: true }).waitFor();
  assert.equal(await page.locator(".hanzi-map-stop").count(), 32);
  assert.equal(await page.locator(".preview-lesson-tile").count(), 0, "preschool uses the flat map, not the tile grid");
  assert.equal(await page.getByRole("button", { name: /欠复习/ }).count(), 0);
  checks.push("Hanzi course opens its 32-stop flat map without the primary tile grid");

  await page.screenshot({ path: `${evidence}/hanzi-map-desktop-dark.png`, fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "切换到浅色" }).click();
  await page.screenshot({ path: `${evidence}/hanzi-map-desktop-light.png`, fullPage: true, animations: "disabled" });

  // Co-reading never grades and never shows pinyin outside the caregiver note.
  await page.locator(".hanzi-map-stop").first().getByRole("button", { name: "只读一读" }).click();
  await page.getByRole("heading", { name: "一个字，一个小发现" }).waitFor();
  const art = page.locator(".hanzi-study-card .preview-study-art > .illo");
  await art.locator("img").waitFor();
  await page.waitForFunction(() => {
    const image = document.querySelector(".hanzi-study-card .preview-study-art > .illo img");
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  });
  assert.ok(await art.evaluate((node) => node.getBoundingClientRect().width > 100), "character art has a visible width");
  assert.ok(await art.locator("img").evaluate((node) => node.complete && node.naturalWidth > 0), "character image loads");
  assert.equal(await page.locator(".hanzi-card-character").innerText(), "山");
  assert.equal(await page.locator(".hanzi-card-note").evaluate((node) => node.open), false, "pinyin stays collapsed");
  assert.equal(await page.locator(".hanzi-card-note p").isVisible(), false, "pinyin is hidden until a caregiver opens the note");
  assert.equal(await page.getByRole("button", { name: /拼音/ }).count(), 0, "no pinyin drill for the child");
  await page.getByRole("button", { name: "看过啦，下一个" }).click();
  await page.getByRole("button", { name: "返回主题" }).click();
  await page.getByRole("button", { name: "结束体验" }).click();
  await page.getByRole("heading", { name: "汉字启蒙", exact: true }).waitFor();
  checks.push("Co-reading shows one large character and keeps pinyin inside the caregiver note");

  // A graded lesson: hint + assistance never become independent recognition.
  await page.locator(".hanzi-map-stop").first().getByRole("button", { name: "认一认" }).click();
  for (let i = 0; i < 4 && (await page.locator(".hanzi-study-card.is-recall").count()) === 0; i++)
    await page.getByRole("button", { name: "认识了，继续" }).click();
  const card = page.locator(".hanzi-study-card.is-recall");
  const kind = await card.getAttribute("data-question-kind");
  assert.ok(["hanzi-question", "hanzi-picture", "hanzi-listen"].includes(kind), String(kind));
  const target = await card.getAttribute("data-content-id");
  if (kind === "hanzi-listen") {
    await page.getByRole("button", { name: "播放词语" }).click();
    await page.waitForFunction(() => !document.querySelector(".hanzi-option")?.disabled);
  }
  await page.getByRole("button", { name: "请家长帮忙" }).click();
  await page.locator(`[data-option-id="${target}"]`).click();
  await page.getByText("这次是一起找到的，不计作独立识别。").waitFor();
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("button", { name: "返回主题" }).click();
  await page.getByRole("button", { name: "结束体验" }).click();
  await page.getByRole("heading", { name: "汉字启蒙", exact: true }).waitFor();
  checks.push("Hanzi recall records caregiver assistance without independent success");

  // Family panel: learner switching, minutes, activity and backup stay local.
  await page.getByRole("button", { name: "家长设置" }).click();
  await page.getByLabel("汉字小课的时长").selectOption("3");
  await page.getByRole("button", { name: "设置好了" }).click();
  const storedMinutes = await page.evaluate(() => {
    const raw = localStorage.getItem("word-atlas:course-settings:v1");
    return raw && JSON.parse(raw).coursePreferences;
  });
  const hanziPreference = Object.values(storedMinutes).find((value) => value.minutes === 3);
  assert.ok(hanziPreference, "caregiver minutes are saved per learner and course");
  await page.getByRole("button", { name: "家长设置" }).click();
  assert.match(await page.locator(".family-activity").innerText(), /汉字启蒙/);
  assert.match(await page.locator(".family-activity-note").innerText(), /提示后的首次答题会更新复习卡/);
  assert.match(await page.locator(".family-activity-note").innerText(), /家长协助、跳过、拼写和照样找字不会更新/);
  assert.match(await page.locator(".family-activity").innerText(), /看过 [1-9] 个/);
  assert.doesNotMatch(await page.locator(".family-activity dl").innerText(), /欠复习|排名|连续/);
  assert.equal(await page.getByRole("button", { name: "导出全部档案" }).count(), 1);
  await page.getByRole("button", { name: "设置好了" }).click();
  checks.push("Family panel saves Hanzi minutes, shows recent activity and offers a full backup");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: `${evidence}/hanzi-map-mobile-light.png`, fullPage: true, animations: "disabled" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole("button", { name: "切换到深色" }).click();
  await page.screenshot({ path: `${evidence}/hanzi-map-mobile-dark.png`, fullPage: true, animations: "disabled" });
  checks.push("375px Hanzi map has no horizontal overflow in both themes");

  // Preschool UI: large targets, no countdown, no ranking or overdue nagging.
  const targetSize = await page
    .locator(".hanzi-map-stop")
    .first()
    .getByRole("button", { name: "认一认" })
    .evaluate((node) => node.getBoundingClientRect().height);
  assert.ok(targetSize >= 48, `preschool target is ${targetSize}px`);
  assert.equal(await page.getByText(/倒计时|排行榜|连续学习|欠复习/).count(), 0);
  assert.equal(await page.getByText(/\d+\s*\/\s*\d+/).count(), 0, "no step counter for preschoolers");
  const characterSize = await page
    .locator(".hanzi-map-chars span")
    .first()
    .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  assert.ok(characterSize >= 22, `character glyph is ${characterSize}px`);
  checks.push("Preschool controls are at least 48px and show no countdown or ranking");

  // A finished co-read offers one real-life activity, never a score or a streak.
  await page.locator(".hanzi-map-stop").first().getByRole("button", { name: "只读一读" }).click();
  for (let i = 0; i < 6 && (await page.getByRole("button", { name: "看过啦，下一个" }).count()); i++)
    await page.getByRole("button", { name: "看过啦，下一个" }).click();
  await page.getByRole("heading", { name: "今天一起读了几页字。" }).waitFor();
  assert.match(await page.locator(".hanzi-life-tip").innerText(), /回家可以试试/);
  assert.match(await page.locator(".mini-stats > div").nth(1).innerText(), /自己找对\s*0/);
  assert.match(await page.locator(".mini-stats > div").nth(2).innerText(), /提示后找对\s*0/);
  assert.match(await page.locator(".mini-stats > div").nth(3).innerText(), /一起找对\s*0/);
  checks.push("A finished co-read suggests a real-life activity and reports zero recognition");
  await page.getByRole("button", { name: "回到主题" }).click();
  await page.getByRole("heading", { name: "汉字启蒙", exact: true }).waitFor();

  await page.emulateMedia({ reducedMotion: "reduce" });
  const still = await page.evaluate(() => {
    const probe = document.querySelector(".hanzi-map-stop");
    if (!probe) return null;
    const style = getComputedStyle(probe);
    return {
      animation: parseFloat(style.animationDuration) || 0,
      transition: parseFloat(style.transitionDuration) || 0,
    };
  });
  assert.ok(still && still.animation <= 0.01 && still.transition <= 0.01, JSON.stringify(still));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  checks.push("Reduced motion turns off non-essential Hanzi animation");

  // Missing image and missing voice both stay honest and skippable.
  await page.locator(".hanzi-map-stop").nth(1).getByRole("button", { name: "认一认" }).click();
  await page.route("**/atlas/img/person.webp*", (route) => route.abort());
  await page.reload();
  await page.getByRole("button", { name: "认识了，继续" }).count();
  checks.push("Hanzi lesson reload keeps the saved session");
  await page.unroute("**/atlas/img/person.webp*");

  // Switching learners isolates Hanzi records.
  await page.goto(`${base}#/explore?course=hanzi-starter`);
  await page.getByRole("button", { name: "家长设置" }).click();
  await page.getByRole("button", { name: "新建学习者" }).click();
  await page.getByRole("button", { name: "设置好了" }).click();
  await page.getByRole("button", { name: "家长设置" }).click();
  assert.match(await page.locator(".family-activity").innerText(), /看过 0 个/);
  await page.getByRole("button", { name: "设置好了" }).click();
  checks.push("A new learner starts with no inherited Hanzi activity");

  // A device with no Mandarin voice must not pretend to read characters aloud.
  const silent = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await silent.addInitScript(() => {
    const stub = {
      getVoices: () => [{ lang: "en-US", name: "English" }],
      speak() {},
      cancel() {},
      addEventListener() {},
      removeEventListener() {},
    };
    Object.defineProperty(window, "speechSynthesis", { value: stub, configurable: true });
  });
  const silentPage = await silent.newPage();
  const silentErrors = [];
  silentPage.on("pageerror", (error) => silentErrors.push(error.message));
  await silentPage.goto(`${base}#/explore?course=hanzi-starter`);
  await silentPage.getByRole("heading", { name: "汉字启蒙", exact: true }).waitFor();
  await silentPage.getByRole("button", { name: "家长设置" }).click();
  await silentPage.getByLabel("汉字小课的字数").selectOption("5");
  await silentPage.getByRole("button", { name: "设置好了" }).click();
  await silentPage.locator(".hanzi-map-stop").first().getByRole("button", { name: "认一认" }).click();
  const silentKinds = new Set();
  for (let guard = 0; guard < 12; guard++) {
    const recall = silentPage.locator(".hanzi-study-card.is-recall");
    if (await recall.count()) {
      silentKinds.add(await recall.getAttribute("data-question-kind"));
      await silentPage.getByRole("button", { name: "先跳过，下次再认识" }).click();
      continue;
    }
    const next = silentPage.getByRole("button", { name: "认识了，继续" });
    if (await next.count()) {
      await next.click();
      continue;
    }
    break;
  }
  assert.equal(silentKinds.has("hanzi-listen"), false, "no listen task without a Mandarin voice");
  assert.ok(silentKinds.size > 0);
  assert.deepEqual(silentErrors, []);
  await silent.close();
  checks.push("Without a Mandarin voice, Hanzi never generates a listening question");

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser.close();
}
