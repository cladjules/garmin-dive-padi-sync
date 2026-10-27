import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { parseGarminDiveFile } from "../../src/lib/fitParser";
import type { DiveFileError } from "../../src/lib/fitParser";
import { createGarminDiveFit } from "../fixtures/garminDiveFixture";

describe("parseGarminDiveFile", () => {
  it("extracts a PADI-ready dive from a Garmin FIT file", async () => {
    const file = new File([Uint8Array.from(createGarminDiveFit()).buffer], "activity.fit");

    const dive = await parseGarminDiveFile(file);

    expect(dive.localDate).toBe("2024-01-01");
    expect(dive.localStartTime).toBe("12:00");
    expect(dive.maxDepthMeters).toBe(18);
    expect(dive.averageDepthMeters).toBe(12);
    expect(dive.bottomTimeMinutes).toBe(45);
    expect(dive.coordinates?.latitude).toBe(0);
    expect(dive.coordinates?.longitude).toBe(0);
    expect(dive.gas).toEqual({
      heliumPercent: 0,
      label: "Air",
      nitrogenPercent: 79,
      oxygenPercent: 21,
      padiValue: "Air",
    });
    expect(dive.startPressureBar).toBe(200);
    expect(dive.endPressureBar).toBe(75);
    expect(dive.bottomTemperatureCelsius).toBe(24);
    expect(dive.surfaceTemperatureCelsius).toBe(25);
    expect(dive.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("opens a Garmin Connect ZIP containing one FIT dive", async () => {
    const archive = zipSync({ "123456/activity.fit": createGarminDiveFit() });
    const file = new File([Uint8Array.from(archive).buffer], "garmin-connect-export.zip");

    const dive = await parseGarminDiveFile(file);

    expect(dive.maxDepthMeters).toBe(18);
    expect(dive.sourceFileName).toBe("garmin-connect-export.zip");
  });

  it("rejects a ZIP containing more than one dive", async () => {
    const fit = createGarminDiveFit();
    const archive = zipSync({ "first.fit": fit, "second.fit": fit });

    await expect(
      parseGarminDiveFile(new File([Uint8Array.from(archive).buffer], "dives.zip")),
    ).rejects.toMatchObject({ code: "unsupported-archive" } satisfies Partial<DiveFileError>);
  });

  it("rejects a non-FIT file with a safe error", async () => {
    const file = new File(["not a FIT file"], "notes.txt");

    await expect(parseGarminDiveFile(file)).rejects.toMatchObject({
      code: "invalid-file",
    } satisfies Partial<DiveFileError>);
  });
});
