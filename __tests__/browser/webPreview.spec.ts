import { expect, test } from "@playwright/test";

test("previews the complete sample import journey", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/");

  await expect(
    page.getByRole("heading", { name: "Move a whole dive trip into PADI in minutes." }),
  ).toBeVisible();
  await expect(page.getByText("Local preview")).toBeVisible();

  await page.getByRole("button", { name: /Try the import flow/i }).click();
  await page.getByRole("button", { name: "Continue with 4 dives" }).click();

  await expect(page.getByRole("dialog", { name: "Ready to import" })).toBeVisible();
  await expect(page.getByText(/exact FIT file was imported before/i)).toBeVisible();
  await page.getByRole("combobox", { name: "Entry type for all dives" }).selectOption("Boat");
  await page.getByRole("button", { name: "Preview 3 dives" }).click();

  await expect(page.getByRole("dialog", { name: "Preview complete" })).toBeVisible();
  await expect(page.getByText("3 simulated · 0 skipped · 0 failed")).toBeVisible();
});

test("keeps the landing page usable on a phone viewport", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("http://127.0.0.1:5173/");

  await expect(
    page.getByRole("heading", { name: "Move a whole dive trip into PADI in minutes." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Try the import flow/i }).click();
  await expect(page.getByRole("dialog", { name: "Choose dives to import" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with 4 dives" })).toBeInViewport();
});
