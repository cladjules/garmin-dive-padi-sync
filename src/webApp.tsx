import { useEffect, useMemo, useState } from "react";

import {
  BatchProgressDialog,
  BatchResultsDialog,
  BatchReviewDialog,
  DiveSelectionDialog,
} from "./components/batchSyncDialog";
import { styles } from "./styles";
import type { BatchImportOutcome, PreparedBatchDive, SkippedBatchDive } from "./types/batch";
import type { EditablePadiDive, PadiDiveType, PadiStatus } from "./types/dive";
import type { GarminActivitySummary } from "./types/garmin";

const sampleActivities: readonly GarminActivitySummary[] = [
  {
    activityId: "9001",
    activityName: "Sardine Run",
    bottomTimeSeconds: 3120,
    locationName: "Moalboal, Cebu",
    maxDepthCentimeters: 1760,
    startTimeLocal: "2026-10-25 09:30:00",
  },
  {
    activityId: "9002",
    activityName: "Pescador Cathedral",
    bottomTimeSeconds: 2880,
    locationName: "Pescador Island",
    maxDepthCentimeters: 2140,
    startTimeLocal: "2026-10-24 13:10:00",
  },
  {
    activityId: "9003",
    activityName: "Talisay Wall",
    bottomTimeSeconds: 2640,
    locationName: "Moalboal, Cebu",
    maxDepthCentimeters: 1890,
    startTimeLocal: "2026-10-24 09:05:00",
  },
  {
    activityId: "9004",
    activityName: "House Reef Check Dive",
    bottomTimeSeconds: 2100,
    locationName: "Panagsama Beach",
    maxDepthCentimeters: 1180,
    startTimeLocal: "2026-10-23 15:40:00",
  },
];

const duplicateActivityId = "9004";

type PreviewStage = "checking" | "dashboard" | "importing" | "results" | "review" | "select";

type WebAppProps = {
  readonly stepDelayMs?: number;
};

function editableDive(activity: GarminActivitySummary): EditablePadiDive {
  return {
    bottomTemperature: 27,
    bottomTimeMinutes: Math.max(1, Math.ceil((activity.bottomTimeSeconds ?? 0) / 60)),
    date: activity.startTimeLocal?.slice(0, 10) ?? "2026-10-25",
    location: activity.locationName ?? "",
    maxDepth: (activity.maxDepthCentimeters ?? 0) / 100,
    notes: "Imported from Garmin Dive. Profile and GPS data checked locally.",
    title: activity.activityName ?? "Garmin dive",
    unitSystem: "Metric",
  };
}

function preparedDive(activity: GarminActivitySummary): PreparedBatchDive {
  const dive = editableDive(activity);
  return {
    activity,
    dive,
    imported: {
      bottomTemperatureCelsius: 27,
      bottomTimeMinutes: dive.bottomTimeMinutes,
      fingerprint: `preview-${activity.activityId}`,
      localDate: dive.date,
      maxDepthMeters: dive.maxDepth,
      sourceFileName: `${activity.activityId}.zip`,
    },
    selected: true,
  };
}

function duplicateResult(): SkippedBatchDive {
  const activity = sampleActivities.find((item) => item.activityId === duplicateActivityId);
  return {
    activityId: duplicateActivityId,
    reason: "The exact FIT file was imported before, so it will not be added again.",
    status: "duplicate",
    title: activity?.activityName ?? "Previously imported dive",
  };
}

function previewOutcomes(items: readonly PreparedBatchDive[]): readonly BatchImportOutcome[] {
  return items
    .filter((item) => item.selected)
    .map((item) => ({
      activityId: item.activity.activityId,
      message: "Preview complete — no PADI log was created.",
      status: "imported" as const,
      title: item.dive.title,
    }));
}

export function WebApp({ stepDelayMs = 560 }: WebAppProps) {
  const [stage, setStage] = useState<PreviewStage>("dashboard");
  const [selectedActivityIds, setSelectedActivityIds] = useState<readonly string[]>(
    sampleActivities.map((activity) => activity.activityId),
  );
  const [prepared, setPrepared] = useState<readonly PreparedBatchDive[]>([]);
  const [skipped, setSkipped] = useState<readonly SkippedBatchDive[]>([]);
  const [progressIndex, setProgressIndex] = useState(0);
  const selectedActivities = useMemo(
    () => sampleActivities.filter((activity) => selectedActivityIds.includes(activity.activityId)),
    [selectedActivityIds],
  );
  const progressItems =
    stage === "checking" ? selectedActivities : prepared.filter((item) => item.selected);

  useEffect(() => {
    if (stage !== "checking" && stage !== "importing") {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (progressIndex + 1 < progressItems.length) {
        setProgressIndex((current) => current + 1);
        return;
      }

      if (stage === "checking") {
        const ready = selectedActivities
          .filter((activity) => activity.activityId !== duplicateActivityId)
          .map(preparedDive);
        setPrepared(ready);
        setSkipped(selectedActivityIds.includes(duplicateActivityId) ? [duplicateResult()] : []);
        setStage("review");
      } else {
        setStage("results");
      }
      setProgressIndex(0);
    }, stepDelayMs);

    return () => window.clearTimeout(timeout);
  }, [
    progressIndex,
    progressItems.length,
    selectedActivities,
    selectedActivityIds,
    stage,
    stepDelayMs,
  ]);

  const resetPreview = (): void => {
    setStage("dashboard");
    setSelectedActivityIds(sampleActivities.map((activity) => activity.activityId));
    setPrepared([]);
    setSkipped([]);
    setProgressIndex(0);
  };

  const startPreview = (): void => {
    setSelectedActivityIds(sampleActivities.map((activity) => activity.activityId));
    setStage("select");
  };

  const toggleActivity = (activityId: string): void => {
    setSelectedActivityIds((current) =>
      current.includes(activityId)
        ? current.filter((candidate) => candidate !== activityId)
        : [...current, activityId],
    );
  };

  const changeDive = (activityId: string, dive: EditablePadiDive): void => {
    setPrepared((current) =>
      current.map((item) => (item.activity.activityId === activityId ? { ...item, dive } : item)),
    );
  };

  const applyDiveType = (diveType: PadiDiveType): void => {
    setPrepared((current) =>
      current.map((item) => ({ ...item, dive: { ...item.dive, diveType } })),
    );
  };

  const togglePreparedDive = (activityId: string): void => {
    setPrepared((current) =>
      current.map((item) =>
        item.activity.activityId === activityId ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const beginImport = (_status: PadiStatus): void => {
    setProgressIndex(0);
    setStage("importing");
  };

  const activeProgressItem = progressItems[Math.min(progressIndex, progressItems.length - 1)];
  const progressTitle =
    activeProgressItem && "activityId" in activeProgressItem
      ? (activeProgressItem.activityName ?? "Garmin dive")
      : activeProgressItem?.dive.title;

  return (
    <>
      <style>{styles}</style>
      <div className="web-page">
        <header className="web-nav">
          <a className="web-brand" href="#top" aria-label="Garmin Dive to PADI home">
            <span className="web-brand-mark" aria-hidden="true">
              ↓
            </span>
            <span>
              <strong>DiveBridge</strong>
              <small>Garmin → PADI</small>
            </span>
          </a>
          <div className="web-nav-actions">
            <span className="web-preview-pill">Local preview</span>
            <button className="web-nav-button" onClick={startPreview} type="button">
              Open importer
            </button>
          </div>
        </header>

        <main id="top">
          <section className="web-hero">
            <div className="web-hero-copy">
              <span className="web-kicker">Your dives. Already filled in.</span>
              <h1>Move a whole dive trip into PADI in minutes.</h1>
              <p>
                Find new Garmin dives, catch duplicates before they happen, review everything in one
                place, and import the batch when it looks right.
              </p>
              <div className="web-hero-actions">
                <button className="web-primary-button" onClick={startPreview} type="button">
                  Try the import flow <span aria-hidden="true">→</span>
                </button>
                <span>Sample data · No account required</span>
              </div>
              <div className="web-flow" aria-label="Import workflow">
                <div>
                  <span>01</span>
                  <strong>Sync</strong>
                  <small>Watch to Garmin</small>
                </div>
                <i aria-hidden="true" />
                <div>
                  <span>02</span>
                  <strong>Review</strong>
                  <small>Check the batch</small>
                </div>
                <i aria-hidden="true" />
                <div>
                  <span>03</span>
                  <strong>Import</strong>
                  <small>Send to PADI</small>
                </div>
              </div>
            </div>

            <div className="web-dashboard" aria-label="Dive import dashboard preview">
              <div className="web-dashboard-topbar">
                <div>
                  <span />
                  <span />
                  <span />
                </div>
                <small>learning.padi.com</small>
              </div>
              <div className="web-dashboard-body">
                <div className="web-dashboard-heading">
                  <div>
                    <span className="web-kicker">Ready when you are</span>
                    <h2>Good afternoon, Julien</h2>
                  </div>
                  <span className="web-connected">
                    <i /> Garmin connected
                  </span>
                </div>
                <div className="web-stat-grid">
                  <article className="web-stat-primary">
                    <span>New Garmin dives</span>
                    <strong>4</strong>
                    <small>Last synced 2 minutes ago</small>
                  </article>
                  <article>
                    <span>Matched in PADI</span>
                    <strong>12</strong>
                    <small>Checked live · Nothing saved</small>
                  </article>
                </div>
                <div className="web-ready-card">
                  <div className="web-dive-orbit" aria-hidden="true">
                    <span>4</span>
                  </div>
                  <div>
                    <span className="web-kicker">Latest trip</span>
                    <h3>Moalboal weekend</h3>
                    <p>4 dives found · 1 likely duplicate</p>
                  </div>
                  <button onClick={startPreview} type="button">
                    Review dives
                  </button>
                </div>
                <div className="web-recent">
                  <div className="web-section-title">
                    <strong>Recently imported</strong>
                    <span>View in PADI</span>
                  </div>
                  <div className="web-recent-row">
                    <span className="web-check">✓</span>
                    <div>
                      <strong>Airplane Wreck</strong>
                      <small>Malapascua · Oct 18</small>
                    </div>
                    <span>24.2 m</span>
                    <small>Published</small>
                  </div>
                  <div className="web-recent-row">
                    <span className="web-check">✓</span>
                    <div>
                      <strong>Monad Shoal</strong>
                      <small>Malapascua · Oct 18</small>
                    </div>
                    <span>27.8 m</span>
                    <small>Published</small>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="web-trust-strip" aria-label="Privacy protections">
            <div>
              <span>⌁</span>
              <strong>Local FIT parsing</strong>
              <small>Your profile stays in-browser</small>
            </div>
            <div>
              <span>◎</span>
              <strong>Duplicate-safe</strong>
              <small>Checked twice before import</small>
            </div>
            <div>
              <span>↗</span>
              <strong>Explicit confirmation</strong>
              <small>Nothing writes without you</small>
            </div>
          </section>
        </main>

        <footer className="web-footer">
          <p>
            Preview mode uses sample dives. Live Garmin and PADI access remains in the browser
            extension so your credentials never enter this page.
          </p>
        </footer>
      </div>

      {stage === "select" ? (
        <DiveSelectionDialog
          activities={sampleActivities}
          alreadyImportedCount={12}
          onClose={resetPreview}
          onContinue={() => {
            setProgressIndex(0);
            setStage("checking");
          }}
          onToggle={toggleActivity}
          remainingCount={0}
          selectedActivityIds={selectedActivityIds}
        />
      ) : null}

      {stage === "checking" || stage === "importing" ? (
        <BatchProgressDialog
          current={Math.min(progressIndex + 1, progressItems.length)}
          demoMode
          itemTitle={progressTitle ?? "Preparing preview"}
          mode={stage}
          total={progressItems.length}
        />
      ) : null}

      {stage === "review" ? (
        <BatchReviewDialog
          demoMode
          items={prepared}
          onApplyDiveType={applyDiveType}
          onBack={() => setStage("select")}
          onChange={changeDive}
          onClose={resetPreview}
          onSave={beginImport}
          onToggle={togglePreparedDive}
          skipped={skipped}
        />
      ) : null}

      {stage === "results" ? (
        <BatchResultsDialog
          demoMode
          onClose={resetPreview}
          onImportMore={resetPreview}
          outcomes={previewOutcomes(prepared)}
          remainingCount={0}
        />
      ) : null}
    </>
  );
}
