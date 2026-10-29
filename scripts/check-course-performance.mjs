/** Reproducible simulated low-end baseline, not a real-phone measurement. */
import { performance } from "node:perf_hooks";
import fs from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.PREVIEW_URL || "http://127.0.0.1:5199/";
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER || "chrome" });
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
try {
  const results = [];
  for (const course of ["primary-starter", "hanzi-starter"]) {
    const samples = [];
    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: "block" });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 100_000 });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const started = performance.now();
      await page.goto(`${base}#/explore?course=${course}`, { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: course === "primary-starter" ? "基础英语" : "汉字启蒙", exact: true }).waitFor();
      const ready = performance.now();
      if (course === "primary-starter") {
        await page.getByRole("button", { name: "开始小课", exact: true }).first().click();
        await page.getByRole("heading", { name: "看看这位新朋友" }).waitFor();
      } else {
        await page.locator(".hanzi-map-stop").first().getByRole("button", { name: "只读一读" }).click();
        await page.getByRole("heading", { name: "一个字，一个小发现" }).waitFor();
      }
      samples.push({ courseReadyMs: Math.round(ready - started), lessonStartMs: Math.round(performance.now() - ready) });
      await context.close();
    }
    results.push({ course, samples, medianCourseReadyMs: median(samples.map((s) => s.courseReadyMs)), medianLessonStartMs: median(samples.map((s) => s.lessonStartMs)),
      medianTotalLessonReadyMs: median(samples.map((s) => s.courseReadyMs + s.lessonStartMs)) });
  }
  const evidence = { recordedAt: new Date().toISOString(), browser: await browser.version(), environment: "desktop Chromium simulation, not a physical phone", viewport: "375x812", cpuThrottle: 4, network: { latencyMs: 150, downloadBytesPerSecond: 200000, uploadBytesPerSecond: 100000 }, serviceWorker: "blocked", samplesPerCourse: 3, results };
  const output = process.env.PERFORMANCE_OUTPUT || "docs/plans/evidence/p5-performance-current.json";
  await fs.writeFile(output, JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser.close(); }
