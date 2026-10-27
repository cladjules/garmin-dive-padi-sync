import { expect, test } from "@playwright/test";

test("publishes readable privacy and support pages for the store listing", async ({
  page,
}, testInfo) => {
  await page.goto("http://127.0.0.1:5173/store/site/index.html");
  await expect(page.getByRole("heading", { name: "DiveBridge" })).toBeVisible();
  await expect(page.getByText("DiveBridge has no application server")).toBeVisible();
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("store-support-home.png") });

  await page.getByRole("link", { name: "Read the privacy policy" }).click();
  await expect(page.getByRole("heading", { name: "DiveBridge Privacy Policy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Storage and retention" })).toBeVisible();
  await expect(page.getByText(/does not sell user information/i)).toBeVisible();
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("store-privacy-policy.png") });

  await page.getByRole("link", { name: "DiveBridge" }).click();
  await page.getByRole("link", { name: "Get support" }).click();
  await expect(page.getByRole("heading", { name: "Support" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Troubleshooting" })).toBeVisible();
});
