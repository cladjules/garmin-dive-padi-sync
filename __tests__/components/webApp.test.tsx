// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { WebApp } from "../../src/webApp";

afterEach(cleanup);

describe("WebApp", () => {
  it("previews the complete duplicate-safe batch journey without contacting accounts", async () => {
    const user = userEvent.setup();
    render(<WebApp stepDelayMs={1} />);

    expect(
      screen.getByRole("heading", { name: "Move a whole dive trip into PADI in minutes." }),
    ).toBeVisible();
    expect(screen.getByText("Sample data · No account required")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Try the import flow/i }));
    expect(screen.getByRole("dialog", { name: "Choose dives to import" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Continue with 4 dives" }));
    expect(await screen.findByRole("dialog", { name: "Ready to import" })).toBeVisible();
    expect(screen.getByText(/exact FIT file was imported before/i)).toBeVisible();
    expect(screen.getByText(/preview never contacts PADI/i)).toBeVisible();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Entry type for all dives" }),
      "Boat",
    );
    await user.click(screen.getByRole("button", { name: "Preview 3 dives" }));

    expect(await screen.findByRole("dialog", { name: "Preview complete" })).toBeVisible();
    expect(screen.getByText("3 simulated · 0 skipped · 0 failed")).toBeVisible();
    expect(screen.getAllByText("Preview complete — no PADI log was created.")).toHaveLength(3);
  });
});
