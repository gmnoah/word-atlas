/** A temporary illustration failure stays recoverable inside both child lessons. */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.PREVIEW_URL || "http://127.0.0.1:5188/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });

async function waitForImage(page) {
  const image = page.locator(".preview-study-art img, .preview-options img").first();
  await image.waitFor({ state: "visible" });
  assert.equal(await image.evaluate((node) => node.complete && node.naturalWidth > 0), true);
}

try {
  for (const course of ["primary-starter", "hanzi-starter"]) {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto(`${base}#/explore?course=${course}`);
    await page.getByRole("heading", {
      name: course === "primary-starter" ? "基础英语" : "汉字启蒙",
      exact: true,
    }).waitFor();
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("word-atlas:v3:primary-session:") ||
          key.startsWith("word-atlas:v3:hanzi-session:")) localStorage.removeItem(key);
      }
    });

    const image = course === "primary-starter" ? "apple.webp" : "mountain.webp";
    await page.route(`**/atlas/img/${image}*`, (route) => route.abort());
    if (course === "primary-starter") {
      await page.getByRole("button", { name: "开始小课", exact: true }).first().click();
    } else {
      await page.locator(".hanzi-map-stop").first()
        .getByRole("button", { name: "只读一读", exact: true }).click();
    }

    await page.getByText(/暂时没打开/).waitFor();
    const retry = page.getByRole("button", { name: "重新加载图片", exact: true });
    await retry.waitFor();
    assert.ok(await retry.evaluate((element) => element.getBoundingClientRect().height >= 47.9));
    await page.unroute(`**/atlas/img/${image}*`);
    await retry.click();
    await waitForImage(page);
    await page.waitForFunction(() => !document.querySelector(".preview-media-error"));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(failures, []);
    await context.close();
  }
  console.log("Passed: both child lessons reload a transient image failure without treating it as an answer.");
} finally {
  await browser.close();
}
