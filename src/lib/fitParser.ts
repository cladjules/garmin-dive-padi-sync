import { unzipSync } from "fflate";
import FitParser, { type ParsedFit } from "fit-file-parser";

import type { DiveCoordinates, GasMix, ImportedDive } from "../types/dive";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const FIT_SIGNATURE = ".FIT";

export class DiveFileError extends Error {
  public constructor(
    message: string,
    public readonly code: "file-too-large" | "invalid-file" | "no-dive" | "unsupported-archive",
  ) {
    super(message);
    this.name = "DiveFileError";
  }
}

function isFitFile(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 12) {
    return false;
  }

  return String.fromCharCode(...bytes.slice(8, 12)) === FIT_SIGNATURE;
}

function extractFitBytes(fileName: string, input: ArrayBuffer): Uint8Array {
  const bytes = new Uint8Array(input);
  if (isFitFile(bytes)) {
    return bytes;
  }

  const isZip = fileName.toLowerCase().endsWith(".zip") || (bytes[0] === 0x50 && bytes[1] === 0x4b);
  if (!isZip) {
    throw new DiveFileError("Choose a Garmin FIT or ZIP export.", "invalid-file");
  }

  let archive: ReturnType<typeof unzipSync>;
  try {
    archive = unzipSync(bytes);
  } catch {
    throw new DiveFileError("The ZIP export could not be opened.", "invalid-file");
  }

  const candidates = Object.entries(archive).filter(
    ([name, value]) => name.toLowerCase().endsWith(".fit") && isFitFile(value),
  );

  if (candidates.length !== 1) {
    throw new DiveFileError(
      candidates.length === 0
        ? "No Garmin FIT file was found in this ZIP export."
        : "This ZIP contains several dives. Export or select one dive at a time.",
      "unsupported-archive",
    );
  }

  const fitBytes = candidates[0]?.[1];
  if (!fitBytes || fitBytes.byteLength > MAX_FILE_BYTES) {
    throw new DiveFileError("The dive file is too large to import safely.", "file-too-large");
  }

  return fitBytes;
}

async function fingerprint(bytes: Uint8Array): Promise<string> {
  const digestInput = Uint8Array.from(bytes).buffer;
  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function positive(value: unknown): number | undefined {
  const number = finite(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function parseDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
}

function datePartsAtOffset(date: Date, offsetMs: number): { date: string; time: string } {
  const local = new Date(date.valueOf() + offsetMs);
  const iso = local.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function localOffsetMs(parsed: ParsedFit): number {
  const activityTimestamp = parseDate(parsed.activity?.timestamp);
  const activityLocalTimestamp = parseDate(parsed.activity?.local_timestamp);

  if (!activityTimestamp || !activityLocalTimestamp) {
    return 0;
  }

  const offset = activityLocalTimestamp.valueOf() - activityTimestamp.valueOf();
  const maximumTimezoneOffset = 14 * 60 * 60 * 1000;
  return Math.abs(offset) <= maximumTimezoneOffset ? offset : 0;
}

function coordinates(parsed: ParsedFit): DiveCoordinates | undefined {
  const session = parsed.sessions?.[0];
  const latitude = finite(session?.end_position_lat) ?? finite(session?.start_position_lat);
  const longitude = finite(session?.end_position_long) ?? finite(session?.start_position_long);

  if (
    latitude === undefined ||
    longitude === undefined ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return undefined;
  }

  return { latitude, longitude };
}

function gasMix(parsed: ParsedFit): GasMix | undefined {
  const gas =
    parsed.dive_gases?.find((candidate) => candidate.status === "enabled") ??
    parsed.dive_gases?.[0];
  const oxygenPercent = finite(gas?.oxygen_content);
  const heliumPercent = finite(gas?.helium_content) ?? 0;

  if (oxygenPercent === undefined || oxygenPercent <= 0 || oxygenPercent + heliumPercent > 100) {
    return undefined;
  }

  const nitrogenPercent = 100 - oxygenPercent - heliumPercent;
  let label = "Other";
  let padiValue: GasMix["padiValue"] = "Enriched";
  if (oxygenPercent === 21 && heliumPercent === 0) {
    label = "Air";
    padiValue = "Air";
  } else if (heliumPercent > 0) {
    label = "Trimix";
    padiValue = "Trimix";
  } else if (oxygenPercent === 32) {
    label = "EANx32";
    padiValue = "Enriched_32";
  } else if (oxygenPercent === 36) {
    label = "EANx36";
    padiValue = "Enriched_36";
  } else if (oxygenPercent === 40) {
    label = "EANx40";
    padiValue = "Enriched_40";
  } else if (oxygenPercent > 21) {
    label = `EANx${oxygenPercent}`;
  }

  return { heliumPercent, label, nitrogenPercent, oxygenPercent, padiValue };
}

function tankPressures(parsed: ParsedFit): { end?: number; start?: number } {
  const tank = parsed.tank_summaries?.find(
    (candidate) => positive(candidate.start_pressure) !== undefined,
  );
  if (tank) {
    return { end: positive(tank.end_pressure), start: positive(tank.start_pressure) };
  }

  const pressures = (parsed.tank_updates ?? [])
    .map((update) => positive(update.pressure))
    .filter((value): value is number => value !== undefined);

  return { end: pressures.at(-1), start: pressures[0] };
}

function temperatures(parsed: ParsedFit): { bottom?: number; surface?: number } {
  const samples = (parsed.records ?? [])
    .map((record) => finite(record.temperature))
    .filter((value): value is number => value !== undefined);

  const session = parsed.sessions?.[0];
  const bottom =
    finite(session?.min_temperature) ?? (samples.length > 0 ? Math.min(...samples) : undefined);
  const surface = samples[0] ?? finite(session?.max_temperature);
  return { bottom, surface };
}

export async function parseGarminDiveFile(file: File): Promise<ImportedDive> {
  if (file.size > MAX_FILE_BYTES) {
    throw new DiveFileError("The dive file is too large to import safely.", "file-too-large");
  }

  const input = await file.arrayBuffer();
  const bytes = extractFitBytes(file.name, input);
  let parsed: ParsedFit;

  try {
    parsed = await new FitParser({
      elapsedRecordField: true,
      force: false,
      lengthUnit: "m",
      mode: "list",
      pressureUnit: "bar",
      temperatureUnit: "celsius",
    }).parseAsync(Uint8Array.from(bytes).buffer);
  } catch {
    throw new DiveFileError("This FIT file is damaged or unsupported.", "invalid-file");
  }

  const session = parsed.sessions?.[0];
  const isDive = session?.sport === "diving" || parsed.dive_summary !== undefined;
  if (!isDive) {
    throw new DiveFileError("This Garmin activity is not a recorded dive.", "no-dive");
  }

  const maxDepthMeters = positive(parsed.dive_summary?.max_depth) ?? positive(session?.max_depth);
  const bottomTimeSeconds =
    positive(parsed.dive_summary?.bottom_time) ??
    positive(session?.total_timer_time) ??
    positive(session?.total_elapsed_time);
  const startTime = parseDate(session?.start_time);

  if (!maxDepthMeters || !bottomTimeSeconds || !startTime) {
    throw new DiveFileError("The dive is missing its date, depth, or bottom time.", "invalid-file");
  }

  const local = datePartsAtOffset(startTime, localOffsetMs(parsed));
  const pressure = tankPressures(parsed);
  const temperature = temperatures(parsed);

  return {
    averageDepthMeters: positive(parsed.dive_summary?.avg_depth),
    bottomTemperatureCelsius: temperature.bottom,
    bottomTimeMinutes: Math.max(1, Math.ceil(bottomTimeSeconds / 60)),
    coordinates: coordinates(parsed),
    diveNumber: positive(parsed.dive_summary?.dive_number),
    endPressureBar: pressure.end,
    fingerprint: await fingerprint(bytes),
    gas: gasMix(parsed),
    localDate: local.date,
    localStartTime: local.time,
    maxDepthMeters,
    sourceFileName: file.name,
    startPressureBar: pressure.start,
    surfaceTemperatureCelsius: temperature.surface,
  };
}
