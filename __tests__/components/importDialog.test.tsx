// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImportDialog } from "../../src/components/importDialog";
import { GarminSetupDialog } from "../../src/components/garminSetupDialog";
import { StatusDialog } from "../../src/components/statusDialog";
import type { EditablePadiDive, ImportedDive } from "../../src/types/dive";

const dive: EditablePadiDive = {
  bottomTimeMinutes: 45,
  date: "2024-01-01",
  diveType: "Boat",
  location: "Blue Reef, Sample Bay",
  maxDepth: 18,
  notes: "Imported from Garmin Dive.",
  title: "Dive #42",
  unitSystem: "Metric",
};

const imported: ImportedDive = {
  bottomTimeMinutes: 45,
  fingerprint: "fingerprint",
  localDate: "2024-01-01",
  maxDepthMeters: 18,
  sourceFileName: "activity.fit",
};

afterEach(cleanup);

describe("ImportDialog", () => {
  it("shows the parsed values and publishes after explicit review", async () => {
    const onSave = vi.fn();
    render(
      <ImportDialog
        dive={dive}
        imported={imported}
        isDuplicate={false}
        isSaving={false}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Review your dive" })).toBeVisible();
    expect(screen.getByLabelText("Dive title")).toHaveValue("Dive #42");
    expect(screen.getByText("18 m")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Import to PADI" }));
    expect(onSave).toHaveBeenCalledWith("Publish");
  });

  it("warns before importing an identical FIT file again", () => {
    render(
      <ImportDialog
        dive={dive}
        imported={imported}
        isDuplicate
        isSaving={false}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("imported before");
    expect(screen.getByRole("button", { name: "Import again" })).toBeEnabled();
  });
});

describe("StatusDialog", () => {
  it("links directly to the imported PADI log entry", () => {
    render(
      <StatusDialog
        kind="success"
        message="The dive is now in your PADI logbook."
        onClose={vi.fn()}
        padiLogId={991}
        title="Dive imported"
      />,
    );

    expect(screen.getByRole("link", { name: "View in PADI" })).toHaveAttribute(
      "href",
      "/logbook/log-dive/recreational/update/991",
    );
  });

  it("offers a recovery action for a Garmin connection error", async () => {
    const onAction = vi.fn();
    render(
      <StatusDialog
        actionLabel="Update Garmin key"
        kind="error"
        message="The key expired."
        onAction={onAction}
        onClose={vi.fn()}
        title="Garmin sync unavailable"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Update Garmin key" }));
    expect(onAction).toHaveBeenCalledOnce();
  });
});

describe("GarminSetupDialog", () => {
  it("saves the key and starts the first sync", async () => {
    const onSave = vi.fn();
    render(
      <GarminSetupDialog
        configured={false}
        isSaving={false}
        onClose={vi.fn()}
        onDisconnect={vi.fn()}
        onSave={onSave}
      />,
    );

    await userEvent.type(screen.getByLabelText("Personal API key"), "  personal-key  ");
    await userEvent.click(screen.getByRole("button", { name: "Save and find dives" }));

    expect(onSave).toHaveBeenCalledWith("personal-key");
    expect(
      screen.getByRole("link", {
        name: /Open Garmin to create your API key/,
      }),
    ).toHaveAttribute("href", "https://connect.garmin.com/app/settings/personalApiToken");
  });
});
