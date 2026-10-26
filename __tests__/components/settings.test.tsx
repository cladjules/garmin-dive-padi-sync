// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsApp } from "../../src/settings";
import type { GarminRuntimeRequest } from "../../src/types/garmin";

function installChrome(): { readonly sendMessage: ReturnType<typeof vi.fn> } {
  const sendMessage = vi.fn((request: GarminRuntimeRequest) => {
    if (request.type === "garmin:get-connection") {
      return Promise.resolve({ configured: false, status: "connection" });
    }
    if (request.type === "garmin:save-key-and-list") {
      return Promise.resolve({
        activities: [
          { activityId: "101", activityName: "Sardine Run" },
          { activityId: "102", activityName: "Pescador Island" },
        ],
        checkedCount: 2,
        status: "dives",
      });
    }
    return Promise.resolve({ status: "disconnected" });
  });

  vi.stubGlobal("chrome", {
    runtime: { sendMessage },
  });
  return { sendMessage };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SettingsApp", () => {
  it("explains onboarding, connects Garmin, and explains live PADI duplicate checks", async () => {
    const storage = installChrome();
    const user = userEvent.setup();
    render(<SettingsApp welcome />);

    expect(screen.getByRole("heading", { name: "Let’s connect your first dive." })).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: "Connect your Garmin account" }),
    ).toBeVisible();
    const privacyHeading = screen.getByRole("heading", { name: "What this extension stores" });
    const connectionHeading = screen.getByRole("heading", {
      name: "Connect your Garmin account",
    });
    expect(privacyHeading.compareDocumentPosition(connectionHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText("Step 1 · Garmin connection")).toBeVisible();
    expect(screen.getByText("Step 2 · PADI import")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Import from the PADI page" })).toBeVisible();
    const padiStep = screen.getByRole("region", { name: "Import from the PADI page" });
    expect(padiStep).toHaveClass("next-step-card-locked");
    expect(within(padiStep).getByRole("button", { name: "Connect Garmin first" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Connect Garmin first" })).toHaveLength(2);
    expect(screen.getByText(/Read live from your PADI logbook/i)).toBeVisible();
    expect(screen.getByText("Stored in this browser")).toBeVisible();
    expect(screen.getByText("Never stored by DiveBridge")).toBeVisible();
    expect(screen.queryByText(/Duplicate history/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Open Garmin to create your API key/,
      }),
    ).toHaveAttribute("href", "https://connect.garmin.com/app/settings/personalApiToken");

    await user.type(screen.getByLabelText("Personal API key"), "private-garmin-key");
    await user.click(screen.getByRole("button", { name: "Connect Garmin" }));

    expect(await screen.findByRole("heading", { name: "Garmin is connected" })).toBeVisible();
    expect(screen.getByText("Read-only")).toBeVisible();
    expect(screen.getByText("On demand")).toBeVisible();
    expect(screen.getByText("Review first")).toBeVisible();
    expect(
      screen.getByText("2 recent Garmin dives were found. Open PADI to identify which are new."),
    ).toBeVisible();
    expect(padiStep).not.toHaveClass("next-step-card-locked");
    expect(within(padiStep).getByRole("link", { name: /Open PADI Logbook/ })).toHaveAttribute(
      "href",
      "https://learning.padi.com/logbook",
    );
    expect(screen.getAllByRole("link", { name: /Open PADI Logbook/ })).toHaveLength(2);
    expect(screen.queryByDisplayValue("private-garmin-key")).not.toBeInTheDocument();
    expect(storage.sendMessage).toHaveBeenCalledWith({
      apiKey: "private-garmin-key",
      type: "garmin:save-key-and-list",
    });
  });
});
