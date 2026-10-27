import { chromium } from "@playwright/test";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const assetsDirectory = "store/assets";
const siteDirectory = "store/site";
const iconPath = "extension/icons/icon128.png";

async function renderPromo(browser, width, height, outputPath) {
  const icon = await readFile(iconPath);
  const iconUrl = `data:image/png;base64,${icon.toString("base64")}`;
  const page = await browser.newPage({ viewport: { height, width } });
  const compact = width < 700;

  await page.setContent(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          html, body { height: 100%; margin: 0; }
          body {
            align-items: center;
            background:
              radial-gradient(circle at 82% 18%, rgba(87, 220, 207, 0.28), transparent 31%),
              linear-gradient(135deg, #053944 0%, #07636b 100%);
            color: #fff;
            display: flex;
            font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            overflow: hidden;
            padding: ${compact ? "28px" : "64px 92px"};
          }
          .layout {
            align-items: center;
            display: grid;
            gap: ${compact ? "20px" : "52px"};
            grid-template-columns: auto 1fr;
            width: 100%;
          }
          .icon {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(178, 244, 236, 0.24);
            border-radius: ${compact ? "22px" : "34px"};
            box-shadow: 0 24px 60px rgba(0, 25, 31, 0.28);
            height: ${compact ? "104px" : "220px"};
            object-fit: contain;
            padding: ${compact ? "12px" : "24px"};
            width: ${compact ? "104px" : "220px"};
          }
          .eyebrow {
            color: #7ce0d5;
            font-size: ${compact ? "10px" : "16px"};
            font-weight: 800;
            letter-spacing: 0.15em;
            text-transform: uppercase;
          }
          h1 {
            font-size: ${compact ? "38px" : "88px"};
            letter-spacing: -0.055em;
            line-height: 0.95;
            margin: ${compact ? "8px 0 9px" : "14px 0 16px"};
          }
          .tagline {
            color: #d8eeee;
            font-size: ${compact ? "15px" : "31px"};
            font-weight: 650;
            margin: 0;
          }
          .trust {
            color: #93c9c8;
            font-size: ${compact ? "9px" : "17px"};
            font-weight: 700;
            margin: ${compact ? "12px 0 0" : "24px 0 0"};
          }
        </style>
      </head>
      <body>
        <main class="layout">
          <img alt="" class="icon" src="${iconUrl}">
          <div>
            <div class="eyebrow">Local-first dive logging</div>
            <h1>DiveBridge</h1>
            <p class="tagline">Garmin dives → PADI logbook</p>
            <p class="trust">Review first · Duplicate-aware · No DiveBridge server</p>
          </div>
        </main>
      </body>
    </html>`);
  await page.screenshot({ animations: "disabled", path: outputPath });
  await page.close();
}

await mkdir(assetsDirectory, { recursive: true });
await mkdir(siteDirectory, { recursive: true });
await copyFile(iconPath, join(assetsDirectory, "icon128.png"));
await copyFile(iconPath, join(siteDirectory, "icon128.png"));

const browser = await chromium.launch({ headless: true });
try {
  await renderPromo(browser, 440, 280, join(assetsDirectory, "small-promo-440x280.png"));
  await renderPromo(browser, 1400, 560, join(assetsDirectory, "marquee-1400x560.png"));
} finally {
  await browser.close();
}

console.log(`Created Chrome Web Store assets in ${assetsDirectory}`);
