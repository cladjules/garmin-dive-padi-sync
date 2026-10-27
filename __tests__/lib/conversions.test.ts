import { describe, expect, it } from "vitest";

import {
  barForPadi,
  celsiusForPadi,
  depthForPadiStorage,
  metersForPadi,
  pressureForPadiStorage,
  temperatureForPadiStorage,
  toEditablePadiDive,
} from "../../src/lib/conversions";
import type { ImportedDive } from "../../src/types/dive";

describe("PADI unit conversions", () => {
  it("round-trips metric dive values through imperial display units", () => {
    const feet = metersForPadi(18, "Imperial");
    const fahrenheit = celsiusForPadi(24, "Imperial");
    const psi = barForPadi(200, "Imperial");

    expect(feet).toBe(59.1);
    expect(depthForPadiStorage(feet, "Imperial")).toBeCloseTo(18.014, 3);
    expect(fahrenheit).toBe(75.2);
    expect(temperatureForPadiStorage(fahrenheit, "Imperial")).toBe(24);
    expect(psi).toBe(2900.8);
    expect(pressureForPadiStorage(psi, "Imperial")).toBeCloseTo(200, 2);
  });
});

describe("toEditablePadiDive", () => {
  it("creates a useful review draft without losing Garmin context", () => {
    const imported: ImportedDive = {
      averageDepthMeters: 12,
      bottomTimeMinutes: 45,
      coordinates: { latitude: 0, longitude: 0 },
      diveNumber: 42,
      fingerprint: "fingerprint",
      localDate: "2024-01-01",
      localStartTime: "12:00",
      maxDepthMeters: 18,
      sourceFileName: "activity.fit",
    };

    const dive = toEditablePadiDive(imported, "Metric");

    expect(dive.title).toBe("Dive #42");
    expect(dive.location).toBe("0.00000, 0.00000");
    expect(dive.maxDepth).toBe(18);
    expect(dive.notes).toContain("Started at 12:00");
    expect(dive.notes).toContain("maps.google.com");
  });

  it("keeps missing optional Garmin fields empty for review", () => {
    const dive = toEditablePadiDive(
      {
        bottomTimeMinutes: 41,
        fingerprint: "fingerprint",
        localDate: "2026-10-26",
        maxDepthMeters: 12,
        sourceFileName: "activity.fit",
      },
      "Metric",
    );

    expect(dive.location).toBe("");
    expect(dive.title).toBe("Garmin dive 2026-10-26");
    expect(dive.bottomTemperature).toBeUndefined();
    expect(dive.startPressure).toBeUndefined();
  });
});
