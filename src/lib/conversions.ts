import type { EditablePadiDive, ImportedDive, PadiUnitSystem } from "../types/dive";

const METERS_TO_FEET = 3.280839895;
const BAR_TO_PSI = 14.503773773;

function round(value: number, digits: number): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

export function metersForPadi(meters: number, unitSystem: PadiUnitSystem): number {
  return round(unitSystem === "Imperial" ? meters * METERS_TO_FEET : meters, 1);
}

export function celsiusForPadi(celsius: number, unitSystem: PadiUnitSystem): number {
  return round(unitSystem === "Imperial" ? (celsius * 9) / 5 + 32 : celsius, 1);
}

export function barForPadi(bar: number, unitSystem: PadiUnitSystem): number {
  return round(unitSystem === "Imperial" ? bar * BAR_TO_PSI : bar, 1);
}

export function depthForPadiStorage(depth: number, unitSystem: PadiUnitSystem): number {
  return round(unitSystem === "Imperial" ? depth / METERS_TO_FEET : depth, 3);
}

export function temperatureForPadiStorage(temperature: number, unitSystem: PadiUnitSystem): number {
  return round(unitSystem === "Imperial" ? ((temperature - 32) * 5) / 9 : temperature, 3);
}

export function pressureForPadiStorage(pressure: number, unitSystem: PadiUnitSystem): number {
  return round(unitSystem === "Imperial" ? pressure / BAR_TO_PSI : pressure, 3);
}

function coordinateLabel(dive: ImportedDive): string {
  if (!dive.coordinates) {
    return "";
  }

  return `${dive.coordinates.latitude.toFixed(5)}, ${dive.coordinates.longitude.toFixed(5)}`;
}

function buildNotes(dive: ImportedDive): string {
  const notes = ["Imported from Garmin Dive."];

  if (dive.localStartTime) {
    notes.push(`Started at ${dive.localStartTime}.`);
  }

  if (dive.averageDepthMeters !== undefined) {
    notes.push(`Average depth: ${dive.averageDepthMeters.toFixed(1)} m.`);
  }

  if (dive.coordinates) {
    notes.push(
      `Garmin GPS: https://maps.google.com/?q=${dive.coordinates.latitude.toFixed(6)},${dive.coordinates.longitude.toFixed(6)}`,
    );
  }

  return notes.join(" ");
}

export function toEditablePadiDive(
  dive: ImportedDive,
  unitSystem: PadiUnitSystem,
): EditablePadiDive {
  const title = dive.diveNumber ? `Dive #${dive.diveNumber}` : `Garmin dive ${dive.localDate}`;

  return {
    bottomTemperature:
      dive.bottomTemperatureCelsius === undefined
        ? undefined
        : celsiusForPadi(dive.bottomTemperatureCelsius, unitSystem),
    bottomTimeMinutes: dive.bottomTimeMinutes,
    date: dive.localDate,
    endPressure:
      dive.endPressureBar === undefined ? undefined : barForPadi(dive.endPressureBar, unitSystem),
    gas: dive.gas,
    location: coordinateLabel(dive),
    maxDepth: metersForPadi(dive.maxDepthMeters, unitSystem),
    notes: buildNotes(dive),
    startPressure:
      dive.startPressureBar === undefined
        ? undefined
        : barForPadi(dive.startPressureBar, unitSystem),
    surfaceTemperature:
      dive.surfaceTemperatureCelsius === undefined
        ? undefined
        : celsiusForPadi(dive.surfaceTemperatureCelsius, unitSystem),
    title,
    unitSystem,
  };
}
