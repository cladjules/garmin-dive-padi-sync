import type { ChangeEvent } from "react";

import type { BatchImportOutcome, PreparedBatchDive, SkippedBatchDive } from "../types/batch";
import type { EditablePadiDive, PadiDiveType, PadiStatus } from "../types/dive";
import type { GarminActivitySummary } from "../types/garmin";

type SelectionDialogProps = {
  readonly activities: readonly GarminActivitySummary[];
  readonly alreadyImportedCount: number;
  readonly onClose: () => void;
  readonly onContinue: () => void;
  readonly onToggle: (activityId: string) => void;
  readonly remainingCount: number;
  readonly selectedActivityIds: readonly string[];
};

type ReviewDialogProps = {
  readonly alreadyImportedCount?: number;
  readonly demoMode?: boolean;
  readonly items: readonly PreparedBatchDive[];
  readonly onApplyDiveType: (diveType: PadiDiveType) => void;
  readonly onBack: () => void;
  readonly onChange: (activityId: string, dive: EditablePadiDive) => void;
  readonly onClose: () => void;
  readonly onSave: (status: PadiStatus) => void;
  readonly onToggle: (activityId: string) => void;
  readonly padiLogCount?: number;
  readonly skipped: readonly SkippedBatchDive[];
};

type ProgressDialogProps = {
  readonly current: number;
  readonly demoMode?: boolean;
  readonly itemTitle: string;
  readonly mode: "checking" | "importing";
  readonly total: number;
};

type ResultsDialogProps = {
  readonly demoMode?: boolean;
  readonly onClose: () => void;
  readonly onImportMore: () => void;
  readonly outcomes: readonly BatchImportOutcome[];
  readonly remainingCount: number;
};

function BatchStepper({ active }: { readonly active: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Import progress" className="db-stepper">
      {[
        [1, "Choose"],
        [2, "Check"],
        [3, "Import"],
      ].map(([step, label]) => (
        <li className={Number(step) <= active ? "db-step-active" : ""} key={label}>
          <span>{step}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function activityDate(activity: GarminActivitySummary): string {
  return activity.startTimeLocal?.slice(0, 10) ?? "Date unavailable";
}

function activityMetrics(activity: GarminActivitySummary): string {
  const metrics: string[] = [];
  if (activity.maxDepthCentimeters !== undefined) {
    metrics.push(`${(activity.maxDepthCentimeters / 100).toFixed(1)} m`);
  }
  if (activity.bottomTimeSeconds !== undefined) {
    metrics.push(`${Math.max(1, Math.ceil(activity.bottomTimeSeconds / 60))} min`);
  }
  return metrics.join(" · ");
}

export function DiveSelectionDialog({
  activities,
  alreadyImportedCount,
  onClose,
  onContinue,
  onToggle,
  remainingCount,
  selectedActivityIds,
}: SelectionDialogProps) {
  const selected = new Set(selectedActivityIds);

  return (
    <div className="db-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="db-selection-title"
        aria-modal="true"
        className="db-dialog db-batch-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="db-dialog-header">
          <div>
            <span className="db-eyebrow">Garmin → PADI</span>
            <h2 id="db-selection-title">Choose dives to import</h2>
            <p>We found {activities.length} new dives in your recent Garmin history.</p>
          </div>
          <button
            aria-label="Close import"
            className="db-icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <BatchStepper active={1} />

        <div className="db-batch-summary">
          <div>
            <strong>{selected.size}</strong>
            <span>selected</span>
          </div>
          <div>
            <strong>{alreadyImportedCount}</strong>
            <span>already imported</span>
          </div>
          <div>
            <strong>{remainingCount}</strong>
            <span>in next batch</span>
          </div>
        </div>

        <div className="db-dive-list">
          {activities.map((activity) => {
            const title = activity.activityName ?? `Garmin dive ${activityDate(activity)}`;
            return (
              <label className="db-dive-choice" key={activity.activityId}>
                <input
                  checked={selected.has(activity.activityId)}
                  onChange={() => onToggle(activity.activityId)}
                  type="checkbox"
                />
                <span className="db-choice-check" aria-hidden="true">
                  ✓
                </span>
                <span className="db-dive-choice-main">
                  <strong>{title}</strong>
                  <span>{activity.locationName ?? "Location will be read from the FIT file"}</span>
                </span>
                <span className="db-dive-choice-meta">
                  <strong>{activityDate(activity)}</strong>
                  <span>{activityMetrics(activity) || "Dive details available after check"}</span>
                </span>
              </label>
            );
          })}
        </div>

        {remainingCount > 0 ? (
          <div className="db-notice db-notice-info">
            {remainingCount} more new dives are outside this safe batch. Import this batch, then run
            again.
          </div>
        ) : null}

        <footer className="db-actions db-sticky-actions">
          <button className="db-button db-button-quiet" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="db-button db-button-primary"
            disabled={selected.size === 0}
            onClick={onContinue}
            type="button"
          >
            Continue with {selected.size} {selected.size === 1 ? "dive" : "dives"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function updateText(
  item: PreparedBatchDive,
  key: "location" | "title",
  event: ChangeEvent<HTMLInputElement>,
  onChange: ReviewDialogProps["onChange"],
): void {
  onChange(item.activity.activityId, { ...item.dive, [key]: event.currentTarget.value });
}

export function BatchReviewDialog({
  alreadyImportedCount = 0,
  demoMode = false,
  items,
  onApplyDiveType,
  onBack,
  onChange,
  onClose,
  onSave,
  onToggle,
  padiLogCount,
  skipped,
}: ReviewDialogProps) {
  const selectedItems = items.filter((item) => item.selected);
  const canImport =
    selectedItems.length > 0 &&
    selectedItems.every(
      (item) =>
        item.dive.title.trim().length > 0 &&
        item.dive.location.trim().length > 0 &&
        item.dive.diveType !== undefined,
    );
  const duplicates =
    alreadyImportedCount + skipped.filter((item) => item.status === "duplicate").length;
  const failedChecks = skipped.filter((item) => item.status === "failed").length;

  return (
    <div className="db-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="db-batch-review-title"
        aria-modal="true"
        className="db-dialog db-batch-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="db-dialog-header">
          <div>
            <span className="db-eyebrow">
              {demoMode ? "Demo duplicate check complete" : "Duplicate check complete"}
            </span>
            <h2 id="db-batch-review-title">Ready to import</h2>
            <p>
              {demoMode
                ? "Review the sample batch. This preview never contacts PADI."
                : "Review the final batch. Nothing has been written to PADI yet."}
            </p>
          </div>
          <button
            aria-label="Close import"
            className="db-icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <BatchStepper active={2} />

        <div className="db-review-toolbar">
          <div>
            <strong>{selectedItems.length}</strong> ready
          </div>
          <div>
            <strong>{duplicates}</strong> duplicates skipped
          </div>
          <div>
            <strong>{failedChecks}</strong> need attention
          </div>
          <label>
            <span>Entry for all</span>
            <select
              aria-label="Entry type for all dives"
              defaultValue=""
              onChange={(event) => onApplyDiveType(event.currentTarget.value as PadiDiveType)}
            >
              <option disabled value="">
                Choose
              </option>
              <option value="Boat">Boat</option>
              <option value="BeachShore">Shore</option>
            </select>
          </label>
        </div>

        {!demoMode && padiLogCount !== undefined ? (
          <div className="db-duplicate-method">
            <strong>Checked against {padiLogCount} recent PADI logs.</strong>
            <span>
              The dive date is the main match. Depth and bottom time only pair multiple dives from
              the same day.
            </span>
          </div>
        ) : null}

        {skipped.length > 0 ? (
          <div className="db-skipped-list">
            {skipped.map((item) => (
              <div className={`db-skip-row db-skip-${item.status}`} key={item.activityId}>
                <span>{item.status === "duplicate" ? "✓" : "!"}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="db-review-list">
          {items.map((item) => (
            <article
              className={`db-review-card ${item.selected ? "" : "db-review-card-off"}`}
              key={item.activity.activityId}
            >
              <header>
                <label className="db-review-toggle">
                  <input
                    checked={item.selected}
                    onChange={() => onToggle(item.activity.activityId)}
                    type="checkbox"
                  />
                  Import this dive
                </label>
                <span>
                  {item.dive.date} · {item.dive.maxDepth}{" "}
                  {item.dive.unitSystem === "Imperial" ? "ft" : "m"} · {item.dive.bottomTimeMinutes}{" "}
                  min
                </span>
              </header>
              <div className="db-review-fields">
                <label className="db-field">
                  <span>Title</span>
                  <input
                    disabled={!item.selected}
                    onChange={(event) => updateText(item, "title", event, onChange)}
                    value={item.dive.title}
                  />
                </label>
                <label className="db-field">
                  <span>Location</span>
                  <input
                    disabled={!item.selected}
                    onChange={(event) => updateText(item, "location", event, onChange)}
                    value={item.dive.location}
                  />
                </label>
                <label className="db-field">
                  <span>Entry</span>
                  <select
                    disabled={!item.selected}
                    onChange={(event) =>
                      onChange(item.activity.activityId, {
                        ...item.dive,
                        diveType: event.currentTarget.value as PadiDiveType,
                      })
                    }
                    value={item.dive.diveType ?? ""}
                  >
                    <option disabled value="">
                      Choose
                    </option>
                    <option value="Boat">Boat</option>
                    <option value="BeachShore">Shore</option>
                  </select>
                </label>
              </div>
            </article>
          ))}
        </div>

        {!canImport && selectedItems.length > 0 ? (
          <div className="db-notice db-notice-warning">
            Add a location and entry type for every selected dive.
          </div>
        ) : null}

        <footer className="db-actions db-sticky-actions">
          <button className="db-button db-button-quiet" onClick={onBack} type="button">
            Back
          </button>
          <span className="db-action-spacer" />
          <button
            className="db-button db-button-secondary"
            disabled={!canImport}
            onClick={() => onSave("Draft")}
            type="button"
          >
            Save all as drafts
          </button>
          <button
            className="db-button db-button-primary"
            disabled={!canImport}
            onClick={() => onSave("Publish")}
            type="button"
          >
            {demoMode
              ? `Preview ${selectedItems.length} ${selectedItems.length === 1 ? "dive" : "dives"}`
              : `Import ${selectedItems.length} to PADI`}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function BatchProgressDialog({
  current,
  demoMode = false,
  itemTitle,
  mode,
  total,
}: ProgressDialogProps) {
  const percent = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div className="db-overlay" role="presentation">
      <section
        aria-labelledby="db-progress-title"
        aria-modal="true"
        className="db-dialog db-progress-dialog"
        role="dialog"
      >
        <BatchStepper active={mode === "checking" ? 2 : 3} />
        <span className="db-eyebrow">
          {mode === "checking"
            ? "Checking duplicates"
            : demoMode
              ? "Previewing PADI import"
              : "Importing to PADI"}
        </span>
        <h2 id="db-progress-title">
          {mode === "checking"
            ? "Preparing your dives"
            : `${demoMode ? "Previewing" : "Importing"} ${current} of ${total}`}
        </h2>
        <p>{itemTitle}</p>
        <div
          aria-label={`${percent}% complete`}
          className="db-progress-track"
          role="progressbar"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percent}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="db-progress-note">
          {demoMode
            ? "Sample data only — Garmin and PADI are not contacted."
            : "Keep this PADI tab open until the check finishes."}
        </p>
      </section>
    </div>
  );
}

export function BatchResultsDialog({
  demoMode = false,
  onClose,
  onImportMore,
  outcomes,
  remainingCount,
}: ResultsDialogProps) {
  const imported = outcomes.filter((item) => item.status === "imported");
  const skipped = outcomes.filter((item) => item.status === "skipped");
  const failed = outcomes.filter((item) => item.status === "failed");

  return (
    <div className="db-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="db-results-title"
        aria-modal="true"
        className="db-dialog db-batch-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="db-dialog-header">
          <div>
            <span className="db-eyebrow">Batch complete</span>
            <h2 id="db-results-title">
              {demoMode
                ? "Preview complete"
                : failed.length === 0
                  ? "Your dives are imported"
                  : "Import finished with issues"}
            </h2>
            <p>
              {imported.length} {demoMode ? "simulated" : "imported"} · {skipped.length} skipped ·{" "}
              {failed.length} failed
            </p>
          </div>
          <button
            aria-label="Close results"
            className="db-icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <BatchStepper active={3} />

        <div className="db-result-list">
          {outcomes.map((item) => (
            <div className={`db-result-row db-result-${item.status}`} key={item.activityId}>
              <span className="db-result-mark">
                {item.status === "imported" ? "✓" : item.status === "skipped" ? "−" : "!"}
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>
                  {item.message ?? (item.status === "imported" ? "Imported to PADI" : "Skipped")}
                </p>
              </div>
              {item.logId ? (
                <a href={`/logbook/log-dive/recreational/update/${item.logId}`}>View</a>
              ) : null}
            </div>
          ))}
        </div>

        {remainingCount > 0 ? (
          <div className="db-notice db-notice-info">
            {remainingCount} more new dives are ready for the next batch.
          </div>
        ) : null}

        <footer className="db-actions">
          <button className="db-button db-button-quiet" onClick={onClose} type="button">
            Done
          </button>
          {remainingCount > 0 ? (
            <button className="db-button db-button-primary" onClick={onImportMore} type="button">
              Import next batch
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
