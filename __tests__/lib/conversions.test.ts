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
    const feet = metersForPadi(17.646, "Imperial");
    const fahrenheit = celsiusForPadi(28, "Imperial");
    const psi = barForPadi(223.59, "Imperial");

    expect(feet).toBe(57.9);
    expect(depthForPadiStorage(feet, "Imperial")).toBeCloseTo(17.648, 3);
    expect(fahrenheit).toBe(82.4);
    expect(temperatureForPadiStorage(fahrenheit, "Imperial")).toBe(28);
    expect(psi).toBe(3242.9);
    expect(pressureForPadiStorage(psi, "Imperial")).toBeCloseTo(223.59, 2);
  });
});

describe("toEditablePadiDive", () => {
  it("creates a useful review draft without losing Garmin context", () => {
    const imported: ImportedDive = {
      averageDepthMeters: 11.291,
      bottomTimeMinutes: 52,
      coordinates: { latitude: 13.8662216, longitude: -61.0788454 },
      diveNumber: 803,
      fingerprint: "fingerprint",
      localDate: "2023-11-22",
      localStartTime: "10:44",
      maxDepthMeters: 17.646,
      sourceFileName: "activity.fit",
    };

    const dive = toEditablePadiDive(imported, "Metric");

    expect(dive.title).toBe("Dive #803");
    expect(dive.location).toBe("13.86622, -61.07885");
    expect(dive.maxDepth).toBe(17.6);
    expect(dive.notes).toContain("Started at 10:44");
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
