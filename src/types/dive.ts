export type DiveCoordinates = {
  readonly latitude: number;
  readonly longitude: number;
};

export type GasMix = {
  readonly heliumPercent: number;
  readonly label: string;
  readonly nitrogenPercent: number;
  readonly oxygenPercent: number;
  readonly padiValue: "Air" | "Enriched" | "Enriched_32" | "Enriched_36" | "Enriched_40" | "Trimix";
};

export type ImportedDive = {
  readonly averageDepthMeters?: number;
  readonly bottomTemperatureCelsius?: number;
  readonly bottomTimeMinutes: number;
  readonly coordinates?: DiveCoordinates;
  readonly diveNumber?: number;
  readonly endPressureBar?: number;
  readonly fingerprint: string;
  readonly gas?: GasMix;
  readonly localDate: string;
  readonly localStartTime?: string;
  readonly maxDepthMeters: number;
  readonly sourceFileName: string;
  readonly startPressureBar?: number;
  readonly surfaceTemperatureCelsius?: number;
};

export type PadiDiveType = "BeachShore" | "Boat";
export type PadiStatus = "Draft" | "Publish";
export type PadiUnitSystem = "Imperial" | "Metric";

export type EditablePadiDive = {
  readonly bottomTemperature?: number;
  readonly bottomTimeMinutes: number;
  readonly date: string;
  readonly diveType?: PadiDiveType;
  readonly endPressure?: number;
  readonly gas?: GasMix;
  readonly location: string;
  readonly maxDepth: number;
  readonly notes: string;
  readonly startPressure?: number;
  readonly surfaceTemperature?: number;
  readonly title: string;
  readonly unitSystem: PadiUnitSystem;
};

export type PadiImportResult = {
  readonly id?: number;
  readonly status: PadiStatus;
};
