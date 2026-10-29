/** Isolated browser; fake speech only records what the application asks to read. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.env.PREVIEW_URL || "http://127.0.0.1:5199/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: "block" });
  await context.addInitScript(() => {
    window.__spoken = [];
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      getVoices: () => [{ name: "test voice", lang: "zh-CN" }],
      speak: (utterance) => { window.__spoken.push({ text: utterance.text, lang: utterance.lang, voice: utterance.voice?.lang }); utterance.onend?.(); },
      cancel() {}, addEventListener() {}, removeEventListener() {},
    } });
  });
  const page = await context.newPage();
  await page.goto(`${base}#/explore?course=hanzi-starter`);
  const group = page.locator(".hanzi-map-stop").filter({ has: page.getByRole("heading", { name: "居家小角落", exact: true }) });
  await group.getByRole("button", { name: "只读一读" }).click();
  await page.getByRole("heading", { name: "沙", exact: true }).waitFor();
  await page.getByRole("button", { name: "看过啦，下一个" }).click();
  await page.getByRole("heading", { name: "发", exact: true }).waitFor();
  await page.getByRole("button", { name: "朗读词语 头发" }).click();
  assert.deepEqual(await page.evaluate(() => window.__spoken.at(-1)), { text: "头发", lang: "zh-CN", voice: "zh-CN" });
  await page.locator(".hanzi-card-note summary").click();
  assert.match(await page.locator(".hanzi-card-note").innerText(), /fà/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log("Passed: 头发 uses contextual Mandarin speech and corrected fà; 375px co-reading works.");
} finally { await browser.close(); }
