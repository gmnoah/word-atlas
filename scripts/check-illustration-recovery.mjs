/** Isolated browser regression: a failed source cannot hide the next picture. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5188/';
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || 'chrome' });
try {
  const page = await browser.newPage();
  await page.route('**/atlas/img/apple.webp', route => route.abort());
  await page.goto(`${base}scripts/fixtures/illustration.html`);
  await page.locator('.illo .plate').waitFor();
  assert.equal(await page.locator('.illo img').count(), 0);
  await page.evaluate(() => window.showIllustration('/atlas/img/banana.webp', 'banana'));
  await page.locator('.illo.is-loaded img').waitFor();
  assert.equal(await page.locator('.illo img').getAttribute('alt'), 'banana');
  assert.equal(await page.locator('.illo img').evaluate(img => img.naturalWidth > 0), true);
  await page.evaluate(() => window.showIllustration(null, 'missing'));
  assert.equal(await page.locator('.illo .plate-word').innerText(), 'missing');
  await page.evaluate(() => window.showIllustration('/atlas/img/banana.webp', 'banana'));
  await page.locator('.illo.is-loaded img').waitFor();
  console.log('Passed: failed and missing illustrations recover when the source changes.');
} finally { await browser.close(); }
