import type { EditablePadiDive, ImportedDive } from "./dive";
import type { GarminActivitySummary } from "./garmin";

export type PreparedBatchDive = {
  readonly activity: GarminActivitySummary;
  readonly dive: EditablePadiDive;
  readonly imported: ImportedDive;
  readonly selected: boolean;
};

export type SkippedBatchDive = {
  readonly activityId: string;
  readonly reason: string;
  readonly status: "duplicate" | "failed";
  readonly title: string;
};

export type BatchImportOutcome = {
  readonly activityId: string;
  readonly logId?: number;
  readonly message?: string;
  readonly status: "failed" | "imported" | "skipped";
  readonly title: string;
};
