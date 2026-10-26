import { useRef, useState, type ChangeEvent } from "react";
import { createRoot } from "react-dom/client";

import {
  BatchProgressDialog,
  BatchResultsDialog,
  BatchReviewDialog,
  DiveSelectionDialog,
} from "./components/batchSyncDialog";
import { GarminSetupDialog } from "./components/garminSetupDialog";
import { ImportDialog } from "./components/importDialog";
import { StatusDialog } from "./components/statusDialog";
import { toEditablePadiDive } from "./lib/conversions";
import { debugLog } from "./lib/debug";
import { DiveFileError, parseGarminDiveFile } from "./lib/fitParser";
import {
  createPadiDive,
  findPadiSession,
  getPadiUnitSystem,
  listRecentPadiDives,
  PadiClientError,
} from "./lib/padiClient";
import { findPadiDuplicate, matchPadiDuplicates, withPadiImportLock } from "./lib/padiDuplicates";
import { styles } from "./styles";
import type { BatchImportOutcome, PreparedBatchDive, SkippedBatchDive } from "./types/batch";
import type { EditablePadiDive, ImportedDive, PadiDiveType, PadiStatus } from "./types/dive";
import {
  GarminRuntimeResponseSchema,
  type GarminActivitySummary,
  type GarminRuntimeRequest,
  type GarminRuntimeResponse,
} from "./types/garmin";
import type { PadiExistingDive } from "./types/padi";

const ROOT_ID = "garmin-dive-padi-sync-root";
const DIVE_TYPE_KEY = "preferredDiveType";
const IMPORT_BATCH_LIMIT = 20;

type BatchContext = {
  readonly activities: readonly GarminActivitySummary[];
  readonly alreadyImportedCount: number;
  readonly checkedCount: number;
  readonly matchedPadiLogIds: readonly number[];
  readonly padiLogCount: number;
  readonly padiLogs: readonly PadiExistingDive[];
  readonly remainingCount: number;
  readonly selectedActivityIds: readonly string[];
};

type ViewState =
  | { readonly name: "idle" }
  | { readonly message: string; readonly name: "loading"; readonly title: string }
  | {
      readonly configured: boolean;
      readonly error?: string;
      readonly isSaving: boolean;
      readonly name: "garmin-setup";
    }
  | ({ readonly name: "bulk-select" } & BatchContext)
  | {
      readonly context: BatchContext;
      readonly current: number;
      readonly itemTitle: string;
      readonly mode: "checking" | "importing";
      readonly name: "bulk-progress";
      readonly total: number;
    }
  | {
      readonly context: BatchContext;
      readonly items: readonly PreparedBatchDive[];
      readonly name: "bulk-review";
      readonly skipped: readonly SkippedBatchDive[];
    }
  | {
      readonly name: "bulk-results";
      readonly outcomes: readonly BatchImportOutcome[];
      readonly remainingCount: number;
    }
  | {
      readonly dive: EditablePadiDive;
      readonly error?: string;
      readonly imported: ImportedDive;
      readonly isDuplicate: boolean;
      readonly isSaving: boolean;
      readonly name: "review";
    }
  | {
      readonly action?: "garmin-setup";
      readonly message: string;
      readonly name: "error";
      readonly title: string;
    }
  | {
      readonly logId?: number;
      readonly message: string;
      readonly name: "success";
      readonly refreshOnClose?: boolean;
      readonly title: string;
    };

async function preferredDiveType(): Promise<PadiDiveType | undefined> {
  const stored = await chrome.storage.local.get(DIVE_TYPE_KEY);
  const value: unknown = stored[DIVE_TYPE_KEY];
  return value === "BeachShore" || value === "Boat" ? value : undefined;
}

function userMessage(error: unknown): { message: string; title: string } {
  if (error instanceof DiveFileError || error instanceof PadiClientError) {
    return {
      message: error.message,
      title: error instanceof DiveFileError ? "That file did not work" : "PADI import unavailable",
    };
  }

  return {
    message: "The dive could not be prepared. Nothing was imported.",
    title: "Import stopped",
  };
}

function batchItemMessage(error: unknown): string {
  if (error instanceof DiveFileError || error instanceof PadiClientError) {
    return error.message;
  }
  return "This dive could not be processed.";
}

async function sendGarminRequest(request: GarminRuntimeRequest): Promise<GarminRuntimeResponse> {
  let raw: unknown;
  try {
    raw = await chrome.runtime.sendMessage(request);
  } catch {
    return {
      code: "unexpected",
      message: "The extension background service could not be reached. Reload PADI and retry.",
      status: "error",
    };
  }

  const response = GarminRuntimeResponseSchema.safeParse(raw);
  return response.success
    ? response.data
    : {
        code: "unexpected",
        message: "The extension returned an unexpected Garmin response. Reload PADI and retry.",
        status: "error",
      };
}

function fileFromBase64(dataBase64: string, fileName: string): File {
  const binary = atob(dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: "application/zip" });
}

function activityTitle(activity: GarminActivitySummary): string {
  return (
    activity.activityName ?? `Garmin dive ${activity.startTimeLocal?.slice(0, 10) ?? ""}`.trim()
  );
}

function activityDuplicateCandidate(activity: GarminActivitySummary) {
  return {
    bottomTimeMinutes:
      activity.bottomTimeSeconds === undefined
        ? undefined
        : Math.max(1, Math.ceil(activity.bottomTimeSeconds / 60)),
    localDate: activity.startTimeLocal?.slice(0, 10),
    maxDepthMeters:
      activity.maxDepthCentimeters === undefined ? undefined : activity.maxDepthCentimeters / 100,
  };
}

function importedDuplicateCandidate(imported: ImportedDive) {
  return {
    bottomTimeMinutes: imported.bottomTimeMinutes,
    localDate: imported.localDate,
    maxDepthMeters: imported.maxDepthMeters,
  };
}

function selectionState(
  response: Extract<GarminRuntimeResponse, { status: "dives" }>,
  padiLogs: readonly PadiExistingDive[],
): ViewState {
  const matches = matchPadiDuplicates(
    response.activities.map(activityDuplicateCandidate),
    padiLogs,
  );
  const matchedPadiLogIds = new Set(matches.flatMap((match) => (match ? [match.id] : [])));
  const candidates = response.activities.filter((_, index) => matches[index] === undefined);
  const activities = candidates.slice(0, IMPORT_BATCH_LIMIT);
  return {
    activities,
    alreadyImportedCount: matchedPadiLogIds.size,
    checkedCount: response.checkedCount,
    matchedPadiLogIds: [...matchedPadiLogIds],
    name: "bulk-select",
    padiLogCount: padiLogs.length,
    padiLogs: padiLogs.filter((log) => !matchedPadiLogIds.has(log.id)),
    remainingCount: Math.max(0, candidates.length - IMPORT_BATCH_LIMIT),
    selectedActivityIds: activities.map((activity) => activity.activityId),
  };
}

function DiveBridge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<ViewState>({ name: "idle" });

  const chooseFile = (): void => {
    setIsMenuOpen(false);
    inputRef.current?.click();
  };

  const prepareFile = async (file: File): Promise<void> => {
    setView({
      message: "Reading the Garmin dive on this device…",
      name: "loading",
      title: "Preparing your dive",
    });
    debugLog("parse_started", { fileSize: file.size });

    try {
      const session = findPadiSession();
      const [imported, unitSystem, savedDiveType, padiLogs] = await Promise.all([
        parseGarminDiveFile(file),
        getPadiUnitSystem(session),
        preferredDiveType(),
        listRecentPadiDives(session),
      ]);
      const isDuplicate =
        findPadiDuplicate(importedDuplicateCandidate(imported), padiLogs) !== undefined;
      const dive = { ...toEditablePadiDive(imported, unitSystem), diveType: savedDiveType };

      debugLog("parse_completed", {
        hasGas: imported.gas !== undefined,
        hasTankPressure: imported.startPressureBar !== undefined,
      });
      setView({ dive, imported, isDuplicate, isSaving: false, name: "review" });
    } catch (error) {
      const detail = userMessage(error);
      debugLog("prepare_failed", {
        code:
          error instanceof DiveFileError || error instanceof PadiClientError
            ? error.code
            : "unexpected",
      });
      setView({ ...detail, name: "error" });
    }
  };

  const showGarminListResponse = async (response: GarminRuntimeResponse): Promise<void> => {
    if (response.status === "setup-required") {
      setView({ configured: false, isSaving: false, name: "garmin-setup" });
      return;
    }
    if (response.status === "error") {
      setView({
        action: response.code === "invalid-key" ? "garmin-setup" : undefined,
        message: response.message,
        name: "error",
        title: "Garmin import unavailable",
      });
      return;
    }
    if (response.status === "no-dives") {
      setView({
        message:
          "No dive activities were found. Sync your watch with Garmin Dive or Garmin Connect, then retry.",
        name: "success",
        title: "No Garmin dives yet",
      });
      return;
    }
    if (response.status === "dives") {
      try {
        const session = findPadiSession();
        const padiLogs = await listRecentPadiDives(session);
        const nextView = selectionState(response, padiLogs);
        if (nextView.name === "bulk-select" && nextView.activities.length === 0) {
          setView({
            message: `The ${response.checkedCount} most recent Garmin dives already match dives in your PADI logbook.`,
            name: "success",
            title: "You’re up to date",
          });
          return;
        }
        setView(nextView);
      } catch (error) {
        const detail = userMessage(error);
        setView({ ...detail, name: "error" });
      }
      return;
    }

    setView({
      message: "Garmin returned an unexpected import response. Nothing was imported.",
      name: "error",
      title: "Garmin import unavailable",
    });
  };

  const startImportFlow = async (): Promise<void> => {
    setIsMenuOpen(false);
    setView({
      message: "Looking for Garmin dives and comparing them with your PADI logbook…",
      name: "loading",
      title: "Finding Garmin dives",
    });
    debugLog("garmin_list_started");
    const response = await sendGarminRequest({ type: "garmin:list-dives" });
    debugLog("garmin_list_completed", { status: response.status });
    await showGarminListResponse(response);
  };

  const openGarminSetup = async (): Promise<void> => {
    setIsMenuOpen(false);
    const response = await sendGarminRequest({ type: "garmin:get-connection" });
    if (response.status !== "connection") {
      await showGarminListResponse(response);
      return;
    }
    setView({ configured: response.configured, isSaving: false, name: "garmin-setup" });
  };

  const saveGarminKey = async (apiKey: string): Promise<void> => {
    if (view.name !== "garmin-setup") {
      return;
    }
    const setupView = view;
    setView({ ...view, error: undefined, isSaving: true });
    const response = await sendGarminRequest({ apiKey, type: "garmin:save-key-and-list" });
    if (response.status === "error" && response.code === "invalid-key") {
      setView({ ...setupView, error: response.message, isSaving: false });
      return;
    }
    await showGarminListResponse(response);
  };

  const disconnectGarmin = async (): Promise<void> => {
    await sendGarminRequest({ type: "garmin:disconnect" });
    setView({
      message: "The saved Garmin Personal API key was removed from this extension.",
      name: "success",
      title: "Garmin disconnected",
    });
  };

  const prepareSelectedDives = async (): Promise<void> => {
    if (view.name !== "bulk-select") {
      return;
    }

    const context: BatchContext = view;
    const selectedIds = new Set(view.selectedActivityIds);
    const selectedActivities = view.activities.filter((activity) =>
      selectedIds.has(activity.activityId),
    );
    if (selectedActivities.length === 0) {
      return;
    }

    try {
      const session = findPadiSession();
      const [unitSystem, savedDiveType] = await Promise.all([
        getPadiUnitSystem(session),
        preferredDiveType(),
      ]);
      const items: PreparedBatchDive[] = [];
      const skipped: SkippedBatchDive[] = [];

      for (const [index, activity] of selectedActivities.entries()) {
        setView({
          context,
          current: index + 1,
          itemTitle: activityTitle(activity),
          mode: "checking",
          name: "bulk-progress",
          total: selectedActivities.length,
        });

        const response = await sendGarminRequest({
          activityId: activity.activityId,
          type: "garmin:download-dive",
        });
        if (response.status === "error") {
          if (response.code === "invalid-key") {
            setView({
              action: "garmin-setup",
              message: response.message,
              name: "error",
              title: "Garmin import unavailable",
            });
            return;
          }
          skipped.push({
            activityId: activity.activityId,
            reason: response.message,
            status: "failed",
            title: activityTitle(activity),
          });
          continue;
        }
        if (response.status !== "dive") {
          skipped.push({
            activityId: activity.activityId,
            reason: "Garmin did not return a usable dive file.",
            status: "failed",
            title: activityTitle(activity),
          });
          continue;
        }

        try {
          const imported = await parseGarminDiveFile(
            fileFromBase64(response.dataBase64, response.fileName),
          );
          const editable = toEditablePadiDive(imported, unitSystem);
          items.push({
            activity,
            dive: {
              ...editable,
              diveType: savedDiveType,
              location: activity.locationName ?? editable.location,
              title: activity.activityName ?? editable.title,
            },
            imported,
            selected: true,
          });
        } catch (error) {
          skipped.push({
            activityId: activity.activityId,
            reason: batchItemMessage(error),
            status: "failed",
            title: activityTitle(activity),
          });
        }
      }

      const parsedMatches = matchPadiDuplicates(
        items.map((item) => importedDuplicateCandidate(item.imported)),
        context.padiLogs,
      );
      const readyItems = items.filter((item, index) => {
        const existing = parsedMatches[index];
        if (!existing) {
          return true;
        }
        skipped.push({
          activityId: item.activity.activityId,
          reason: `Already exists in your PADI logbook on ${item.imported.localDate} (log #${existing.id}).`,
          status: "duplicate",
          title: activityTitle(item.activity),
        });
        return false;
      });

      debugLog("batch_check_completed", { ready: readyItems.length, skipped: skipped.length });
      setView({ context, items: readyItems, name: "bulk-review", skipped });
    } catch (error) {
      const detail = userMessage(error);
      setView({ ...detail, name: "error" });
    }
  };

  const updateBatchDive = (activityId: string, dive: EditablePadiDive): void => {
    if (view.name !== "bulk-review") {
      return;
    }
    setView({
      ...view,
      items: view.items.map((item) =>
        item.activity.activityId === activityId ? { ...item, dive } : item,
      ),
    });
  };

  const toggleBatchDive = (activityId: string): void => {
    if (view.name !== "bulk-review") {
      return;
    }
    setView({
      ...view,
      items: view.items.map((item) =>
        item.activity.activityId === activityId ? { ...item, selected: !item.selected } : item,
      ),
    });
  };

  const applyBatchDiveType = (diveType: PadiDiveType): void => {
    if (view.name !== "bulk-review") {
      return;
    }
    setView({
      ...view,
      items: view.items.map((item) => ({
        ...item,
        dive: { ...item.dive, diveType },
      })),
    });
  };

  const importBatch = async (status: PadiStatus): Promise<void> => {
    if (view.name !== "bulk-review") {
      return;
    }

    const reviewView = view;
    const selectedItems = view.items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      return;
    }

    let session;
    try {
      session = findPadiSession();
    } catch (error) {
      const detail = userMessage(error);
      setView({ ...detail, name: "error" });
      return;
    }

    const outcomes: BatchImportOutcome[] = view.skipped.map((item) => ({
      activityId: item.activityId,
      message: item.reason,
      status: item.status === "duplicate" ? "skipped" : "failed",
      title: item.title,
    }));

    try {
      await withPadiImportLock(async () => {
        const baselineLogIds = new Set(reviewView.context.matchedPadiLogIds);
        const latestPadiLogs = (await listRecentPadiDives(session)).filter(
          (log) => !baselineLogIds.has(log.id),
        );
        const liveMatches = matchPadiDuplicates(
          selectedItems.map((item) => importedDuplicateCandidate(item.imported)),
          latestPadiLogs,
        );
        const importedFingerprints = new Set<string>();

        for (const [index, item] of selectedItems.entries()) {
          setView({
            context: reviewView.context,
            current: index + 1,
            itemTitle: item.dive.title,
            mode: "importing",
            name: "bulk-progress",
            total: selectedItems.length,
          });

          const existing = liveMatches[index];
          if (existing || importedFingerprints.has(item.imported.fingerprint)) {
            outcomes.push({
              activityId: item.activity.activityId,
              message: existing
                ? `Already exists in your PADI logbook (log #${existing.id}).`
                : "The same Garmin file is already in this batch.",
              status: "skipped",
              title: item.dive.title,
            });
            continue;
          }

          try {
            const result = await createPadiDive(session, item.dive, status);
            importedFingerprints.add(item.imported.fingerprint);
            outcomes.push({
              activityId: item.activity.activityId,
              logId: result.id,
              message: status === "Draft" ? "Saved as a PADI draft" : "Imported to PADI",
              status: "imported",
              title: item.dive.title,
            });
          } catch (error) {
            outcomes.push({
              activityId: item.activity.activityId,
              message: batchItemMessage(error),
              status: "failed",
              title: item.dive.title,
            });
          }
        }
      });
    } catch (error) {
      const detail = userMessage(error);
      setView({ ...detail, name: "error" });
      return;
    }

    const rememberedDiveType = selectedItems.find((item) => item.dive.diveType)?.dive.diveType;
    if (rememberedDiveType) {
      await chrome.storage.local.set({ [DIVE_TYPE_KEY]: rememberedDiveType });
    }
    debugLog("batch_import_completed", {
      failed: outcomes.filter((item) => item.status === "failed").length,
      imported: outcomes.filter((item) => item.status === "imported").length,
      skipped: outcomes.filter((item) => item.status === "skipped").length,
    });
    setView({
      name: "bulk-results",
      outcomes,
      remainingCount: reviewView.context.remainingCount,
    });
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) {
      void prepareFile(file);
    }
  };

  const saveSingleDive = async (status: PadiStatus): Promise<void> => {
    if (view.name !== "review") {
      return;
    }

    setView({ ...view, error: undefined, isSaving: true });
    debugLog("padi_import_started", { status });

    try {
      const session = findPadiSession();
      const outcome = await withPadiImportLock(async () => {
        const latestPadiLogs = await listRecentPadiDives(session);
        const existing = findPadiDuplicate(
          importedDuplicateCandidate(view.imported),
          latestPadiLogs,
        );
        if (!view.isDuplicate && existing) {
          return { duplicateId: existing.id } as const;
        }
        return { result: await createPadiDive(session, view.dive, status) } as const;
      });

      if ("duplicateId" in outcome) {
        setView({
          ...view,
          error: `This dive already exists in PADI as log #${outcome.duplicateId}. Confirm again only if you intend to create a duplicate.`,
          isDuplicate: true,
          isSaving: false,
        });
        return;
      }

      const result = outcome.result;
      if (view.dive.diveType) {
        await chrome.storage.local.set({ [DIVE_TYPE_KEY]: view.dive.diveType });
      }

      debugLog("padi_import_completed", { status });
      setView({
        logId: result.id,
        message:
          status === "Draft"
            ? "The dive is safely in your PADI drafts."
            : "The dive is now in your PADI logbook.",
        name: "success",
        refreshOnClose: true,
        title: status === "Draft" ? "Draft saved" : "Dive imported",
      });
    } catch (error) {
      const detail = userMessage(error);
      debugLog("padi_import_failed", {
        code: error instanceof PadiClientError ? error.code : "unexpected",
      });
      setView({ ...view, error: detail.message, isSaving: false });
    }
  };

  return (
    <>
      <div className="db-launcher-wrap">
        {isMenuOpen ? (
          <div className="db-launcher-menu" role="menu">
            <button onClick={chooseFile} role="menuitem" type="button">
              Choose a FIT or ZIP file
            </button>
            <button onClick={() => void openGarminSetup()} role="menuitem" type="button">
              Garmin connection settings
            </button>
          </div>
        ) : null}
        <div className="db-launcher-row">
          <button className="db-launcher" onClick={() => void startImportFlow()} type="button">
            <span>Import Garmin dives</span>
            <span aria-hidden="true" className="db-launcher-arrow">
              →
            </span>
          </button>
          <button
            aria-expanded={isMenuOpen}
            aria-label="More Garmin import options"
            className="db-launcher db-launcher-more"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            ⋯
          </button>
        </div>
      </div>
      <input
        accept=".fit,.zip,application/zip,application/octet-stream"
        aria-hidden="true"
        onChange={handleFile}
        ref={inputRef}
        style={{ display: "none" }}
        tabIndex={-1}
        type="file"
      />

      {view.name === "loading" ? (
        <StatusDialog
          kind="loading"
          message={view.message}
          onClose={() => undefined}
          title={view.title}
        />
      ) : null}
      {view.name === "error" ? (
        <StatusDialog
          actionLabel={view.action === "garmin-setup" ? "Update Garmin key" : undefined}
          kind="error"
          message={view.message}
          onAction={view.action === "garmin-setup" ? () => void openGarminSetup() : undefined}
          onClose={() => setView({ name: "idle" })}
          title={view.title}
        />
      ) : null}
      {view.name === "success" ? (
        <StatusDialog
          kind="success"
          message={view.message}
          onClose={() =>
            view.refreshOnClose ? window.location.reload() : setView({ name: "idle" })
          }
          padiLogId={view.logId}
          title={view.title}
        />
      ) : null}
      {view.name === "garmin-setup" ? (
        <GarminSetupDialog
          configured={view.configured}
          error={view.error}
          isSaving={view.isSaving}
          onClose={() => setView({ name: "idle" })}
          onDisconnect={() => void disconnectGarmin()}
          onSave={(apiKey) => void saveGarminKey(apiKey)}
        />
      ) : null}
      {view.name === "bulk-select" ? (
        <DiveSelectionDialog
          activities={view.activities}
          alreadyImportedCount={view.alreadyImportedCount}
          onClose={() => setView({ name: "idle" })}
          onContinue={() => void prepareSelectedDives()}
          onToggle={(activityId) =>
            setView({
              ...view,
              selectedActivityIds: view.selectedActivityIds.includes(activityId)
                ? view.selectedActivityIds.filter((id) => id !== activityId)
                : [...view.selectedActivityIds, activityId],
            })
          }
          remainingCount={view.remainingCount}
          selectedActivityIds={view.selectedActivityIds}
        />
      ) : null}
      {view.name === "bulk-progress" ? (
        <BatchProgressDialog
          current={view.current}
          itemTitle={view.itemTitle}
          mode={view.mode}
          total={view.total}
        />
      ) : null}
      {view.name === "bulk-review" ? (
        <BatchReviewDialog
          alreadyImportedCount={view.context.alreadyImportedCount}
          items={view.items}
          onApplyDiveType={applyBatchDiveType}
          onBack={() => setView({ ...view.context, name: "bulk-select" })}
          onChange={updateBatchDive}
          onClose={() => setView({ name: "idle" })}
          onSave={(status) => void importBatch(status)}
          onToggle={toggleBatchDive}
          padiLogCount={view.context.padiLogCount}
          skipped={view.skipped}
        />
      ) : null}
      {view.name === "bulk-results" ? (
        <BatchResultsDialog
          onClose={() => window.location.reload()}
          onImportMore={() => void startImportFlow()}
          outcomes={view.outcomes}
          remainingCount={view.remainingCount}
        />
      ) : null}
      {view.name === "review" ? (
        <ImportDialog
          dive={view.dive}
          error={view.error}
          imported={view.imported}
          isDuplicate={view.isDuplicate}
          isSaving={view.isSaving}
          onChange={(dive) => setView({ ...view, dive })}
          onClose={() => setView({ name: "idle" })}
          onSave={(status) => void saveSingleDive(status)}
        />
      ) : null}
    </>
  );
}

function mount(): void {
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const host = document.createElement("div");
  host.id = ROOT_ID;
  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = styles;
  const app = document.createElement("div");

  shadowRoot.append(style, app);
  document.documentElement.append(host);
  createRoot(app).render(<DiveBridge />);
}

mount();
