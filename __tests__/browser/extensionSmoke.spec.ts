import { chromium, expect, test } from "@playwright/test";
import { zipSync } from "fflate";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createGarminDiveFit } from "../fixtures/garminDiveFixture";

function startHarness(): Promise<{ readonly port: number; readonly server: Server }> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(`<!doctype html>
      <html>
        <head><meta charset="utf-8"><title>PADI Learning smoke harness</title></head>
        <body><main><h1>PADI Learning</h1><p>Controlled extension smoke harness</p></main></body>
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
              activityName: "Pescador Island",
              bottomTime: 3164,
              locationName: "Pescador, Moalboal",
              maxDepth: 1764,
              startTimeLocal: "2023-11-23 10:44:47",
            },
            {
              activityId: 8675309,
              activityName: "Sardine Run",
              bottomTime: 3164,
              locationName: "Moalboal",
              maxDepth: 1764,
              startTimeLocal: "2023-11-22 10:44:47",
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
    await page.getByRole("button", { name: "Continue with 2 dives" }).click();

    await expect(page.getByRole("dialog", { name: "Ready to import" })).toBeVisible();
    await expect(page.locator('input[value="Sardine Run"]')).toBeVisible();
    await expect(page.locator('input[value="Pescador Island"]')).toBeVisible();
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
