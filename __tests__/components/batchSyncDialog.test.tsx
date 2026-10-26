// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BatchProgressDialog,
  BatchResultsDialog,
  BatchReviewDialog,
  DiveSelectionDialog,
} from "../../src/components/batchSyncDialog";
import type { PreparedBatchDive } from "../../src/types/batch";
import type { GarminActivitySummary } from "../../src/types/garmin";

const activities: readonly GarminActivitySummary[] = [
  {
    activityId: "101",
    activityName: "Sardine Run",
    bottomTimeSeconds: 3120,
    locationName: "Moalboal",
    maxDepthCentimeters: 1760,
    startTimeLocal: "2026-10-25 09:30:00",
  },
  {
    activityId: "102",
    activityName: "Pescador Island",
    startTimeLocal: "2026-10-24 08:15:00",
  },
];

const prepared: PreparedBatchDive = {
  activity: activities[0],
  dive: {
    bottomTimeMinutes: 52,
    date: "2026-10-25",
    diveType: "Boat",
    location: "Moalboal",
    maxDepth: 17.6,
    notes: "Imported from Garmin Dive.",
    title: "Sardine Run",
    unitSystem: "Metric",
  },
  imported: {
    bottomTimeMinutes: 52,
    fingerprint: "fingerprint",
    localDate: "2026-10-25",
    maxDepthMeters: 17.6,
    sourceFileName: "activity.zip",
  },
  selected: true,
};

afterEach(cleanup);

describe("DiveSelectionDialog", () => {
  it("shows the batch summary and confirms the selected dives", async () => {
    const onContinue = vi.fn();
    const onToggle = vi.fn();
    render(
      <DiveSelectionDialog
        activities={activities}
        alreadyImportedCount={3}
        onClose={vi.fn()}
        onContinue={onContinue}
        onToggle={onToggle}
        remainingCount={4}
        selectedActivityIds={["101", "102"]}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Choose dives to import" })).toBeVisible();
    expect(screen.getByText("17.6 m · 52 min")).toBeVisible();
    expect(
      screen.getByText(
        "4 more new dives are outside this safe batch. Import this batch, then run again.",
      ),
    ).toBeVisible();

    await userEvent.click(screen.getByRole("checkbox", { name: /Pescador Island/i }));
    expect(onToggle).toHaveBeenCalledWith("102");
    await userEvent.click(screen.getByRole("button", { name: "Continue with 2 dives" }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});

describe("BatchReviewDialog", () => {
  it("shows duplicate results and requires one final batch confirmation", async () => {
    const onSave = vi.fn();
    render(
      <BatchReviewDialog
        alreadyImportedCount={3}
        items={[prepared]}
        onApplyDiveType={vi.fn()}
        onBack={vi.fn()}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onSave={onSave}
        onToggle={vi.fn()}
        padiLogCount={42}
        skipped={[
          {
            activityId: "100",
            reason: "The exact FIT file was imported before.",
            status: "duplicate",
            title: "House Reef",
          },
        ]}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Ready to import" })).toBeVisible();
    expect(screen.getByText("Checked against 42 recent PADI logs.")).toBeVisible();
    expect(screen.getByText(/The dive date is the main match/i)).toBeVisible();
    expect(screen.getByText("4", { selector: ".db-review-toolbar strong" })).toBeVisible();
    expect(screen.getByText("The exact FIT file was imported before.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Import 1 to PADI" }));
    expect(onSave).toHaveBeenCalledWith("Publish");
  });
});

describe("batch progress and results", () => {
  it("shows progress and completes the reviewed batch", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <BatchProgressDialog current={1} itemTitle="Sardine Run" mode="checking" total={2} />,
    );
    expect(screen.getByRole("progressbar", { name: "50% complete" })).toBeVisible();

    rerender(
      <BatchResultsDialog
        onClose={onClose}
        onImportMore={vi.fn()}
        outcomes={[
          { activityId: "101", logId: 991, status: "imported", title: "Sardine Run" },
          { activityId: "100", status: "skipped", title: "House Reef" },
        ]}
        remainingCount={2}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Your dives are imported" })).toBeVisible();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/logbook/log-dive/recreational/update/991",
    );
    expect(screen.getByRole("button", { name: "Import next batch" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
