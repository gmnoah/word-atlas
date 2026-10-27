/** Isolated browser smoke test. Never connects to an existing user browser/profile. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.PREVIEW_URL || "http://localhost:5188/";
const evidence = "output/preview-check";
await fs.mkdir(evidence, { recursive: true });
const fixture = JSON.parse(
  await fs.readFile("tests/fixtures/legacy/storage-v2.json", "utf8"),
);
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PREVIEW_BROWSER || "chrome",
});
const checks = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  await context.addInitScript((fixture) => {
    for (const [key, value] of Object.entries(fixture)) {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(value));
    }
  }, fixture);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(`${base}#/explore`);
  await page
    .getByRole("heading", { name: "每一份好奇，都值得被点亮。" })
    .waitFor();
  await page.locator(".preview-space .illo img").first().waitFor();
  assert.equal(await page.locator(".preview-space-grid [data-course-id]").count(), 3);
  for (const title of ["初中英语", "高中英语"]) {
    assert.equal(await page.getByRole("button", { name: `${title}待开放` }).isDisabled(), true);
  }
  assert.equal(await page.locator(".preview-planned a").count(), 0);
  checks.push("Registry renders three working spaces and two non-interactive planned courses");
  await page.screenshot({
    path: `${evidence}/home-dark.png`,
    fullPage: true,
    animations: "disabled",
  });
  assert.equal(
    requests.some((url) => url.endsWith("/atlas/index.json")),
    false,
    "preview must not load IELTS index",
  );
  checks.push("Preview loads independently without requesting IELTS index");
  await page.getByRole("button", { name: "切换到浅色" }).click();
  await page.screenshot({
    path: `${evidence}/home-light.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "家长设置" }).click();
  await page.getByLabel("英语小课的词数").selectOption("2");
  await page.getByRole("button", { name: "设置好了" }).click();
  await page.getByRole("button", { name: "探索基础英语" }).click();
  const advancedStage = page.getByRole("button", { name: /多认识一些/ });
  await advancedStage.click();
  assert.equal(await advancedStage.getAttribute("aria-pressed"), "true");
  await page.screenshot({ path: `${evidence}/primary-start-desktop-light.png`, fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "切换到深色" }).click();
  await page.screenshot({ path: `${evidence}/primary-start-desktop-dark.png`, fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "切换到浅色" }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "切换到深色" }).click();
    await page.screenshot({ path: `${evidence}/primary-start-mobile-${theme}.png`, fullPage: true, animations: "disabled" });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `primary course ${theme} must not overflow`);
  }
  await page.getByRole("button", { name: "切换到浅色" }).click();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByLabel("水果篮子起始词").selectOption("en-grape");
  await page.getByRole("button", { name: "开始小课" }).first().click();
  await page.getByRole("heading", { name: "grape", exact: true }).waitFor();
  assert.equal(await page.locator(".english-word-card-details").getAttribute("open"), "");
  await page.screenshot({ path: `${evidence}/word-card-desktop-light.png`, fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "切换到深色" }).click();
  await page.screenshot({ path: `${evidence}/word-card-desktop-dark.png`, fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: `${evidence}/word-card-mobile-dark.png`, animations: "disabled" });
  await page.getByRole("button", { name: "切换到浅色" }).click();
  await page.screenshot({ path: `${evidence}/word-card-mobile-light.png`, fullPage: true, animations: "disabled" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole("button", { name: "认识了，继续" }).click();
  await page.getByRole("heading", { name: "apple", exact: true }).waitFor();
  assert.equal(await page.locator(".english-word-card-details .example-target").innerText(), "apples");
  assert.equal(await page.locator(".english-word-card-details .preview-example p").innerText(), "I like apples.");
  checks.push("Explicit example form highlights apples while preserving the full sentence");
  await page.getByRole("button", { name: "返回主题" }).click();
  await page.getByRole("button", { name: "结束体验" }).click();
  // This isolated fixture starts a new scenario; production users keep their checkpoint.
  await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("word-atlas:v3:primary-session:")).forEach((key) => localStorage.removeItem(key)));
  await page.getByLabel("水果篮子起始词").selectOption("en-apple");
  await page.getByRole("button", { name: "家长设置" }).click();
  await page.getByLabel("英语小课的词数").selectOption("5");
  await page.getByRole("button", { name: "设置好了" }).click();
  await page.getByRole("button", { name: "开始小课" }).first().click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "认识了，继续" }).click();
  assert.equal(await page.locator(".preview-option").count(), 3, "advanced policy uses 3 options after a 3-word group");
  await page.getByRole("button", { name: "返回主题" }).click();
  await page.getByRole("button", { name: "结束体验" }).click();
  await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("word-atlas:v3:primary-session:")).forEach((key) => localStorage.removeItem(key)));
  await page.getByRole("button", { name: /小步启蒙/ }).click();
  await page.getByRole("button", { name: "开始小课" }).first().click();
  assert.equal(await page.locator(".english-word-card-details").getAttribute("open"), null);
  await page.locator(".english-word-card-details summary").click();
  assert.equal(await page.locator(".english-word-card-details").getAttribute("open"), "");
  await page.getByRole("button", { name: "认识了，继续" }).click();
  assert.equal(await page.locator(".english-word-card-details").getAttribute("open"), null, "new starter word resets its details");
  await page.getByRole("button", { name: "认识了，继续" }).click();
  assert.equal(await page.locator(".preview-option").count(), 2, "starter policy uses 2 options after a 2-word group");
  await page.getByRole("button", { name: "返回主题" }).click();
  await page.getByRole("button", { name: "结束体验" }).click();
  await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("word-atlas:v3:primary-session:")).forEach((key) => localStorage.removeItem(key)));
  await page.getByRole("button", { name: "家长设置" }).click();
  await page.getByLabel("英语小课的词数").selectOption("2");
  await page.getByRole("button", { name: "设置好了" }).click();
  checks.push("Primary stage and custom theme start select the actual first word and wrap safely");
  await page.getByRole("button", { name: "开始小课" }).first().click();
  await page.getByRole("button", { name: "认识了，继续" }).click();
  await page.getByRole("button", { name: "认识了，继续" }).click();
  async function preparePrimaryQuestion() {
    const card = page.locator(".preview-study-card.is-recall");
    const kind = await card.getAttribute("data-question-kind");
    if (kind.startsWith("listen-")) {
      assert.equal(await page.locator(".preview-option").first().isDisabled(), true);
      await page.getByRole("button", { name: "播放题目发音" }).click();
      await page.waitForFunction(() => !document.querySelector(".preview-option")?.disabled);
    }
    const target = await card.getAttribute("data-content-id");
    return { kind, target };
  }
  let question = await preparePrimaryQuestion();
  await page.getByRole("button", { name: "给我一点提示" }).click();
  await page.locator(`[data-option-id="${question.target}"]`).click();
  assert.equal(await page.locator(".preview-option:disabled").count(), 2);
  await page.getByRole("button", { name: "继续", exact: true }).click();
  question = await preparePrimaryQuestion();
  await page.locator(`[data-option-id="${question.target}"]`).click();
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("heading", { name: "今天，又认识了新朋友。" }).waitFor();
  assert.match(await page.locator(".mini-stats > div").nth(2).innerText(), /1/);
  checks.push(
    "English lesson: parent count, introductions, hint, locked first answer, completion",
  );
  await page.getByRole("button", { name: "回到主题" }).click();
  await page.getByRole("button", { name: "学习空间", exact: true }).click();
  await page.getByRole("button", { name: "一起认汉字" }).click();
  await page.locator(".hanzi-map-stop").first().getByRole("button", { name: "认一认" }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: `${evidence}/hanzi-mobile-light.png`,
    fullPage: true,
    animations: "disabled",
  });
  for (let i = 0; i < 3 && (await page.locator(".hanzi-study-card.is-recall").count()) === 0; i++)
    await page.getByRole("button", { name: "认识了，继续" }).click();
  const hanziCard = page.locator(".hanzi-study-card.is-recall");
  const hanziKind = await hanziCard.getAttribute("data-question-kind");
  if (hanziKind === "hanzi-listen") {
    await page.getByRole("button", { name: "播放字的读音" }).click();
    await page.waitForFunction(() => !document.querySelector(".hanzi-option")?.disabled);
  }
  await page.getByRole("button", { name: "请家长帮忙" }).click();
  await page.locator(`[data-option-id="${await hanziCard.getAttribute("data-content-id")}"]`).click();
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("button", { name: "先跳过，下次再认识" }).click();
  assert.match(await page.locator(".mini-stats > div").nth(1).innerText(), /0/);
  checks.push(
    "Hanzi: co-reading, caregiver assistance, skip, no false independent success",
  );
  const stored = await page.evaluate(() =>
    localStorage.getItem("word-atlas:v2:word-atlas-open"),
  );
  assert.deepEqual(
    JSON.parse(stored),
    fixture["word-atlas:v2:word-atlas-open"],
  );
  checks.push("Legacy progress remains byte-equivalent in structure");
  await page.goto(`${base}#/explore`);
  await page
    .getByRole("heading", { name: "每一份好奇，都值得被点亮。" })
    .waitFor();
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "切换到深色" }).click();
    await page.screenshot({
      path: `${evidence}/home-mobile-${theme}.png`,
      fullPage: true,
      animations: "disabled",
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "no mobile horizontal overflow",
    );
  }
  checks.push(
    "375px mobile, both themes, no horizontal overflow; reload safely resets preview",
  );
  await page.route("**/atlas/img/apple.webp", (route) => route.abort());
  await page.getByRole("button", { name: "探索基础英语" }).click();
  await page.getByRole("button", { name: "开始小课" }).first().click();
  await page.getByText("这幅图暂时没打开，可以先跳过。").waitFor();
  await page.getByRole("button", { name: "先跳过，下次再认识" }).click();
  await page.route("**/atlas/audio/uk/banana.mp3", (route) => route.abort());
  await page.getByRole("button", { name: "朗读 banana", exact: true }).click();
  await page
    .getByText("暂时无法播放，可以重试，也可以请家长读一读。")
    .waitFor();
  await page.unroute("**/atlas/audio/uk/banana.mp3");
  await page.getByRole("button", { name: "返回主题" }).click();
  await page.getByRole("button", { name: "继续这次小课" }).click();
  await page.getByRole("button", { name: "返回主题" }).click();
  await page.getByRole("button", { name: "结束体验" }).click();
  await page.getByRole("heading", { name: "基础英语", exact: true }).waitFor();
  checks.push("Image/audio failure, skip, cancel exit and confirmed exit");
  await page.unroute("**/atlas/img/apple.webp");
  await page.goto(`${base}#/w/apple`);
  await page.getByRole("dialog").waitFor();
  await page.getByRole("heading", { name: "apple", exact: true }).waitFor();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.goto(`${base}#/`);
  await page.getByRole("link", { name: /新的学习旅程/ }).waitFor();
  assert.deepEqual(
    JSON.parse(
      await page.evaluate(() =>
        localStorage.getItem("word-atlas:v2:word-atlas-open"),
      ),
    ),
    fixture["word-atlas:v2:word-atlas-open"],
  );
  assert.deepEqual(errors, []);
  checks.push("Legacy word deep link and Today entry work; zero page errors");
  // Verify that leaving IELTS cancels an ambience track still being decoded.
  // This deterministic Web Audio double runs only inside the isolated test page.
  const audioPage = await context.newPage();
  await audioPage.goto(`${base}#/explore`);
  await audioPage.getByRole("button", { name: "探索基础英语" }).waitFor();
  const startedAfterCancel = await audioPage.evaluate(async (base) => {
    let started = 0;
    const gain = () => ({
      gain: {
        value: 0,
        cancelScheduledValues() {},
        setValueAtTime() {},
        linearRampToValueAtTime() {},
      },
      connect() {
        return this;
      },
    });
    window.AudioContext = class {
      state = "running";
      currentTime = 0;
      destination = {};
      createGain() {
        return gain();
      }
      async decodeAudioData() {
        return { duration: 3 };
      }
      createBufferSource() {
        return {
          connect() {
            return gain();
          },
          start() {
            started++;
          },
          stop() {},
        };
      }
    };
    const sound = await import(new URL("src/lib/sound.ts", base).href);
    const originalFetch = window.fetch;
    let release;
    window.fetch = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    try {
      const pending = sound.setAmbience("rain");
      await sound.setAmbience(null);
      release(new Response(new ArrayBuffer(1)));
      await pending;
      return started;
    } finally {
      window.fetch = originalFetch;
    }
  }, base);
  assert.equal(startedAfterCancel, 0);
  await audioPage.close();
  checks.push(
    "A delayed legacy ambience request cannot restart audio after cancellation",
  );
  await fs.writeFile(
    `${evidence}/results.json`,
    JSON.stringify(
      { checks, pageErrors: errors, screenshots: evidence },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser.close();
}
