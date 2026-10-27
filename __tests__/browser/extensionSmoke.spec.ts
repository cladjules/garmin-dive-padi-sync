import { chromium, expect, test, type Page } from "@playwright/test";
import { zipSync } from "fflate";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createGarminDiveFit } from "../fixtures/garminDiveFixture";

const storeAssetsDirectory = process.env.STORE_ASSETS_DIRECTORY;

async function captureStoreScreenshot(
  page: Page,
  fileName: string,
  anchorSelector?: string,
): Promise<void> {
  if (!storeAssetsDirectory) {
    return;
  }

  await mkdir(storeAssetsDirectory, { recursive: true });
  await page.setViewportSize({ height: 800, width: 1280 });
  if (anchorSelector) {
    await page.locator(anchorSelector).evaluate((element) => {
      document.documentElement.style.scrollBehavior = "auto";
      const top = element.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo(0, Math.max(0, top));
    });
  } else {
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
    });
  }
  await page.screenshot({
    animations: "disabled",
    path: join(storeAssetsDirectory, fileName),
  });
}

function startHarness(): Promise<{ readonly port: number; readonly server: Server }> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>PADI Learning</title>
          <style>
            * { box-sizing: border-box; }
            body { background: #f5f8f8; color: #183c43; font-family: Arial, sans-serif; margin: 0; }
            header { align-items: center; background: #fff; border-bottom: 1px solid #dce7e5; display: flex; justify-content: space-between; padding: 20px 42px; }
            h1 { font-size: 22px; margin: 0; }
            header span { color: #5e777b; font-size: 13px; }
            main { margin: 0 auto; max-width: 1080px; padding: 38px 30px; }
            main h2 { font-size: 32px; margin: 0 0 9px; }
            main > p { color: #6c8286; margin: 0 0 25px; }
            .log-grid { display: grid; gap: 14px; grid-template-columns: repeat(3, 1fr); }
            .log-card { background: #fff; border: 1px solid #dce7e5; border-radius: 14px; min-height: 150px; padding: 18px; }
            .log-card strong { display: block; margin-bottom: 8px; }
            .log-card span { color: #7a8e91; font-size: 12px; }
          </style>
        </head>
        <body>
          <header><h1>PADI Learning</h1><span>My logbook</span></header>
          <main>
            <h2>Dive logbook</h2>
            <p>Review your recreational dive history.</p>
            <div class="log-grid">
              <div class="log-card"><strong>Recent dives</strong><span>Your saved logs appear here.</span></div>
              <div class="log-card"><strong>Drafts</strong><span>Finish incomplete dive logs.</span></div>
              <div class="log-card"><strong>Statistics</strong><span>See your logged dive activity.</span></div>
            </div>
          </main>
        </body>
      </html>`);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("The smoke-test server did not provide a port"));
        return;
      }
      resolve({ port: address.port, server });
    });
  });
}

async function stopHarness(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function fakePadiToken(): string {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({
    aud: "7l7c6rgndimr802cfhva7akdsh",
    "custom:affiliate_id": "4242",
    exp: 4_102_444_800,
  })}.signature`;
}

function fakeGarminToken(): string {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ exp: 4_102_444_800 })}.signature`;
}

test("onboards Garmin and imports a reviewed dive batch once through the production extension bundle", async ({
  browserName,
}, testInfo) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), `divebridge-${browserName}-test-`));
  const extensionDirectory = join(temporaryRoot, "extension");
  await mkdir(extensionDirectory);
  await cp("dist/content.js", join(extensionDirectory, "content.js"));
  await cp("dist/background.js", join(extensionDirectory, "background.js"));
  await cp("dist/icons", join(extensionDirectory, "icons"), { recursive: true });
  await cp("dist/settings.css", join(extensionDirectory, "settings.css"));
  await cp("dist/settings.html", join(extensionDirectory, "settings.html"));
  await cp("dist/settings.js", join(extensionDirectory, "settings.js"));
  const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8")) as {
    content_scripts: Array<{ matches: string[] }>;
    host_permissions: string[];
  };
  const harness = await startHarness();
  const harnessOrigin = `http://127.0.0.1:${harness.port}`;
  const [contentScript] = manifest.content_scripts;
  if (!contentScript) {
    throw new Error("The extension manifest has no content script");
  }
  contentScript.matches = [`${harnessOrigin}/*`];
  manifest.host_permissions.push(`${harnessOrigin}/*`);
  await writeFile(join(extensionDirectory, "manifest.json"), JSON.stringify(manifest));

  const context = await chromium.launchPersistentContext(join(temporaryRoot, "profile"), {
    args: [
      `--disable-extensions-except=${extensionDirectory}`,
      `--load-extension=${extensionDirectory}`,
    ],
    channel: "chromium",
    headless: false,
  });

  try {
    await context.addInitScript((token: string) => {
      localStorage.setItem("CognitoIdentityServiceProvider.client.user.idToken", token);
    }, fakePadiToken());

    const createdDives: unknown[] = [];
    const padiLogs: Array<{
      depth_times: Array<{ bottom_time: number; max_depth: number }>;
      dive_date: string;
      dive_location: string;
      dive_title: string;
      experiences: Array<{ notes: string | null }>;
      id: number;
      status: "Draft" | "Publish";
    }> = [];
    let createDiveCount = 0;
    await context.route("https://divelog.global-prod.padi.com/**", async (route) => {
      const payload: unknown = route.request().postDataJSON();
      const body = payload as { query?: string; variables?: unknown };
      const isUnitQuery = body.query?.includes("logbook_units_settings") ?? false;
      const isRecentDivesQuery = body.query?.includes("DiveBridgeRecentDives") ?? false;
      if (!isUnitQuery && !isRecentDivesQuery) {
        createdDives.push(body.variables);
        createDiveCount += 1;
        const variables = body.variables as {
          general: Array<{
            depth_times: { data: { bottom_time: number; max_depth: number } };
            dive_date: string;
            dive_location: string;
            dive_title: string;
            experiences: { data: { notes: string | null } };
            status: "Draft" | "Publish";
          }>;
        };
        const created = variables.general[0];
        if (created) {
          padiLogs.push({
            depth_times: [created.depth_times.data],
            dive_date: created.dive_date,
            dive_location: created.dive_location,
            dive_title: created.dive_title,
            experiences: [created.experiences.data],
            id: 990 + createDiveCount,
            status: created.status,
          });
        }
      }
      await route.fulfill({
        body: JSON.stringify(
          isUnitQuery
            ? { data: { logbook_units_settings: [{ unit: "Metric" }] } }
            : isRecentDivesQuery
              ? { data: { logbook_logs: padiLogs } }
              : {
                  data: {
                    insert_logbook_logs: {
                      affected_rows: 1,
                      returning:
                        createDiveCount === 1
                          ? []
                          : [{ id: 990 + createDiveCount, status: "Publish" }],
                    },
                  },
                },
        ),
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        status: 200,
      });
    });

    const garminArchives = new Map([
      ["8675309", zipSync({ "activity.fit": createGarminDiveFit() })],
      ["8675310", zipSync({ "activity.fit": createGarminDiveFit(86_400) })],
    ]);
    await context.route("https://personal.connectapi.garmin.com/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/personal-api-key/token")) {
        await route.fulfill({ body: fakeGarminToken(), status: 200 });
        return;
      }
      if (url.pathname.includes("/activities/search/activities")) {
        await route.fulfill({
          body: JSON.stringify([
            {
              activityId: 8675310,
              activityName: "Coral Garden",
              bottomTime: 2700,
              locationName: "Sample Cove",
              maxDepth: 1800,
              startTimeLocal: "2024-01-02 12:00:00",
            },
            {
              activityId: 8675309,
              activityName: "Blue Reef",
              bottomTime: 2700,
              locationName: "Sample Bay",
              maxDepth: 1800,
              startTimeLocal: "2024-01-01 12:00:00",
            },
          ]),
          contentType: "application/json",
          status: 200,
        });
        return;
      }
      const activityId = url.pathname.split("/").at(-1);
      const archive = activityId ? garminArchives.get(activityId) : undefined;
      await route.fulfill({
        body: archive ? Buffer.from(archive) : "",
        status: archive ? 200 : 404,
      });
    });

    const serviceWorker =
      context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const extensionId = new URL(serviceWorker.url()).host;
    const settingsPage = await context.newPage();
    await settingsPage.goto(`chrome-extension://${extensionId}/settings.html?welcome=1`);
    await expect(
      settingsPage.getByRole("heading", { name: "Let’s connect your first dive." }),
    ).toBeVisible();
    await expect(settingsPage.getByText(/phone syncs the watch to Garmin’s cloud/i)).toBeVisible();
    const privacyHeading = settingsPage.getByRole("heading", {
      name: "What this extension stores",
    });
    const connectionHeading = settingsPage.getByRole("heading", {
      name: "Connect your Garmin account",
    });
    const padiImportHeading = settingsPage.getByRole("heading", {
      name: "Import from the PADI page",
    });
    await expect(privacyHeading).toBeVisible();
    await expect(connectionHeading).toBeVisible();
    await expect(padiImportHeading).toBeVisible();
    const padiStep = settingsPage.getByRole("region", { name: "Import from the PADI page" });
    await expect(padiStep).toHaveClass(/next-step-card-locked/);
    await expect(padiStep.getByRole("button", { name: "Connect Garmin first" })).toBeDisabled();
    await expect(
      settingsPage.locator(".settings-nav").getByRole("button", { name: "Connect Garmin first" }),
    ).toBeDisabled();
    await captureStoreScreenshot(settingsPage, "01-extension-overview-1280x800.png");
    await captureStoreScreenshot(
      settingsPage,
      "02-connect-garmin-1280x800.png",
      ".setup-section-heading",
    );
    const privacyHeadingBox = await privacyHeading.boundingBox();
    const connectionHeadingBox = await connectionHeading.boundingBox();
    const padiImportHeadingBox = await padiImportHeading.boundingBox();
    expect((privacyHeadingBox?.y ?? Infinity) < (connectionHeadingBox?.y ?? -Infinity)).toBe(true);
    expect((privacyHeadingBox?.y ?? Infinity) < (padiImportHeadingBox?.y ?? -Infinity)).toBe(true);
    const garminKeyLink = settingsPage.getByRole("link", {
      name: /Open Garmin to create your API key/,
    });
    await expect(garminKeyLink).toBeVisible();
    await expect(garminKeyLink).toHaveAttribute(
      "href",
      "https://connect.garmin.com/app/settings/personalApiToken",
    );
    await settingsPage.screenshot({
      fullPage: true,
      path: testInfo.outputPath("settings-garmin-key-cta.png"),
    });
    await settingsPage.getByLabel("Personal API key").fill("browser-test-key");
    await settingsPage.getByRole("button", { exact: true, name: "Connect Garmin" }).click();
    await expect(settingsPage.getByRole("heading", { name: "Garmin is connected" })).toBeVisible();
    await expect(
      settingsPage.getByText(
        "2 recent Garmin dives were found. Open PADI to identify which are new.",
      ),
    ).toBeVisible();
    await expect(padiStep).not.toHaveClass(/next-step-card-locked/);
    await expect(padiStep.getByRole("link", { name: /Open PADI Logbook/ })).toBeVisible();
    await expect(
      settingsPage.locator(".settings-nav").getByRole("link", { name: /Open PADI Logbook/ }),
    ).toBeVisible();
    await captureStoreScreenshot(
      settingsPage,
      "03-ready-for-padi-1280x800.png",
      ".setup-section-heading",
    );
    const setupCards = settingsPage.locator(".setup-grid > .settings-card");
    await expect(setupCards).toHaveCount(2);
    const connectionCardBox = await setupCards.nth(0).boundingBox();
    const padiCardBox = await setupCards.nth(1).boundingBox();
    expect(connectionCardBox).not.toBeNull();
    expect(padiCardBox).not.toBeNull();
    expect(Math.abs((connectionCardBox?.height ?? 0) - (padiCardBox?.height ?? 0))).toBeLessThan(2);
    await settingsPage.screenshot({
      fullPage: true,
      path: testInfo.outputPath("settings-two-step-layout.png"),
    });

    const page = await context.newPage();
    await page.goto(harnessOrigin);
    const launcher = page.getByRole("button", { name: "Import Garmin dives" });
    await expect(launcher).toBeVisible();

    await launcher.click();
    await expect(page.getByRole("dialog", { name: "Choose dives to import" })).toBeVisible();
    await expect(page.getByText("2 new dives")).toBeVisible();
    await captureStoreScreenshot(page, "04-choose-dives-1280x800.png");
    await page.getByRole("button", { name: "Continue with 2 dives" }).click();

    await expect(page.getByRole("dialog", { name: "Ready to import" })).toBeVisible();
    await expect(page.locator('input[value="Blue Reef"]')).toBeVisible();
    await expect(page.locator('input[value="Coral Garden"]')).toBeVisible();
    await captureStoreScreenshot(page, "05-review-before-import-1280x800.png");
    await page.getByLabel("Entry type for all dives").selectOption("Boat");
    await page.getByRole("button", { name: "Import 2 to PADI" }).click();

    await expect(page.getByRole("dialog", { name: "Your dives are imported" })).toBeVisible();
    await expect(page.getByText("2 imported · 0 skipped · 0 failed")).toBeVisible();
    expect(createdDives).toHaveLength(2);
    expect(createDiveCount).toBe(2);
    expect(JSON.stringify(createdDives)).not.toContain("DiveBridge source");

    await Promise.all([
      page.waitForNavigation(),
      page.getByRole("button", { name: "Done" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "PADI Learning" })).toBeVisible();
    await launcher.click();
    await expect(page.getByRole("dialog", { name: "You’re up to date" })).toBeVisible();
    expect(createDiveCount).toBe(2);
  } finally {
    await context.close();
    await stopHarness(harness.server);
  }
});
