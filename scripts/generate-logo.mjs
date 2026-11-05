import fs from "node:fs/promises";
import { chromium } from "playwright";

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <!-- Background Gradient: Deep Night Sky with Warm Glow -->
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1c253d" />
      <stop offset="100%" stop-color="#0c101c" />
    </radialGradient>
    
    <!-- Warm Gold Gradient for Rings & Stars -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f5d28b" />
      <stop offset="50%" stop-color="#e8b65a" />
      <stop offset="100%" stop-color="#cb922c" />
    </linearGradient>

    <!-- Terracotta Red Gradient for Compass Pointer -->
    <linearGradient id="terraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f08e6f" />
      <stop offset="100%" stop-color="#c4573a" />
    </linearGradient>

    <!-- Soft Ivory for Highlights -->
    <linearGradient id="ivoryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f2ebdd" />
    </linearGradient>

    <!-- Soft Glow Filter -->
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Base Rounded Badge -->
  <rect width="128" height="128" rx="28" fill="url(#bgGrad)" stroke="url(#goldGrad)" stroke-width="1.8" stroke-opacity="0.45" />

  <!-- Outer Celestial Coordinates Ring -->
  <circle cx="64" cy="64" r="54" fill="none" stroke="url(#goldGrad)" stroke-width="1.2" stroke-opacity="0.6" stroke-dasharray="1.5 3" />
  <circle cx="64" cy="64" r="49" fill="none" stroke="#f2ebdd" stroke-width="0.8" stroke-opacity="0.25" />

  <!-- Compass Quadrant Cardinal Points -->
  <circle cx="64" cy="10" r="1.8" fill="url(#goldGrad)" />
  <circle cx="64" cy="118" r="1.8" fill="url(#goldGrad)" />
  <circle cx="10" cy="64" r="1.8" fill="url(#goldGrad)" />
  <circle cx="118" cy="64" r="1.8" fill="url(#goldGrad)" />

  <!-- Sheltering Haven Arch / "安" (An) Gentle Roofline -->
  <path d="M34 68 C34 40, 94 40, 94 68" fill="none" stroke="url(#goldGrad)" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.4" />
  <path d="M42 66 C42 46, 86 46, 86 66" fill="none" stroke="url(#ivoryGrad)" stroke-width="1" stroke-linecap="round" stroke-opacity="0.2" />

  <!-- Open Book / Atlas Page Silhouette at the Bottom (Ground of Wisdom) -->
  <path d="M32 94 C46 90, 58 92, 64 96 C70 92, 82 90, 96 94 C93 86, 81 83, 64 86 C47 83, 35 86, 32 94 Z" fill="url(#ivoryGrad)" opacity="0.35" />
  <path d="M34 92 C46 88, 58 90, 64 94 C70 90, 82 88, 94 92" fill="none" stroke="url(#goldGrad)" stroke-width="1.2" stroke-linecap="round" opacity="0.7" />

  <!-- The "遇" (Encounter) Beacon Compass Needle & North Star -->
  <!-- Horizontal Wings -->
  <path d="M26 64 L64 58 L102 64 L64 70 Z" fill="#f2ebdd" opacity="0.3" />

  <!-- Vertical Star Needle -->
  <!-- Left Side: Terracotta Warm Red (Forward Path) -->
  <path d="M64 22 L72 64 L64 64 Z" fill="url(#terraGrad)" filter="url(#softGlow)" />
  <path d="M64 64 L72 64 L64 88 Z" fill="url(#terraGrad)" opacity="0.75" />
  
  <!-- Right Side: Ivory Warm Light (Quiet Reflection) -->
  <path d="M64 22 L56 64 L64 64 Z" fill="url(#ivoryGrad)" />
  <path d="M64 64 L56 64 L64 88 Z" fill="#9db5cc" opacity="0.8" />

  <!-- Guiding Constellation Dots (Little Star Lights) -->
  <circle cx="38" cy="38" r="1.5" fill="url(#goldGrad)" opacity="0.8" />
  <circle cx="90" cy="38" r="1.5" fill="url(#goldGrad)" opacity="0.8" />
  <circle cx="48" cy="28" r="1" fill="#f2ebdd" opacity="0.6" />
  <circle cx="80" cy="28" r="1" fill="#f2ebdd" opacity="0.6" />

  <!-- Central Pivot Core (Golden Jewel) -->
  <circle cx="64" cy="64" r="5" fill="#0c101c" stroke="url(#goldGrad)" stroke-width="1.6" />
  <circle cx="64" cy="64" r="2.2" fill="url(#goldGrad)" />
</svg>
`;

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#131a2b"/>
  <circle cx="16" cy="16" r="12" fill="none" stroke="#e8b65a" stroke-width="1.2" stroke-dasharray="1 1.5"/>
  <path d="M16 4 L18.8 16 L16 26.5 L13.2 16 Z" fill="#f2ebdd"/>
  <path d="M16 4 L18.8 16 H13.2 Z" fill="#e57c5a"/>
  <path d="M6 16 L16 13.8 L26 16 L16 18.2 Z" fill="#f2ebdd" opacity="0.35"/>
  <circle cx="16" cy="16" r="1.8" fill="#131a2b" stroke="#e8b65a" stroke-width="1"/>
</svg>
`;

async function main() {
  await fs.mkdir("public/brand", { recursive: true });
  await fs.writeFile("public/brand/logo.svg", svgContent.trim());
  await fs.writeFile("public/favicon.svg", faviconSvg.trim());
  console.log("✔ Saved public/brand/logo.svg & public/favicon.svg");

  // Render high-res PNG (512x512) via Playwright Chromium
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 512, height: 512, deviceScaleFactor: 2 } });
    
    // 512x512 high-res rendering with crisp anti-aliasing
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 512px; height: 512px; display: grid; place-items: center; background: transparent; }
    svg { width: 512px; height: 512px; }
  </style>
</head>
<body>
  ${svgContent.replace('width="128" height="128"', 'width="512" height="512"')}
</body>
</html>`;

    await page.setContent(html);
    await page.screenshot({ path: "public/brand/logo.png", omitBackground: true });
    await page.screenshot({ path: "public/icon-512.png", omitBackground: false });
    console.log("✔ Rendered public/brand/logo.png (512x512) & public/icon-512.png (512x512)");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
