import assert from "node:assert/strict";
import { chromium } from "playwright";
import fs from "node:fs/promises";
const base = process.env.PREVIEW_URL || "http://localhost:5188/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
await fs.mkdir("output/preview-check", { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}#/about`);
  await page.getByRole("heading", { name: "一词一画，一起发现。" }).waitFor();
  await page.getByText(/小学英语和汉字启蒙体验样板/).waitFor();
  for (const size of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(size);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `output/preview-check/about-${size.width}-${theme}.png`, fullPage: true, animations: "disabled" });
    }
  }
  assert.deepEqual(errors, []);
  console.log("Passed: About page, attribution and desktop/mobile themes");
} finally { await browser.close(); }
