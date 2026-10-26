import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { parseGarminDiveFile } from "../../src/lib/fitParser";
import type { DiveFileError } from "../../src/lib/fitParser";
import { createGarminDiveFit } from "../fixtures/garminDiveFixture";

describe("parseGarminDiveFile", () => {
  it("extracts a PADI-ready dive from a Garmin FIT file", async () => {
    const file = new File([Uint8Array.from(createGarminDiveFit()).buffer], "activity.fit");

    const dive = await parseGarminDiveFile(file);

    expect(dive.localDate).toBe("2023-11-22");
    expect(dive.localStartTime).toBe("10:44");
    expect(dive.maxDepthMeters).toBe(17.646);
    expect(dive.averageDepthMeters).toBe(11.291);
    expect(dive.bottomTimeMinutes).toBe(52);
    expect(dive.coordinates?.latitude).toBeCloseTo(13.8662216, 5);
    expect(dive.coordinates?.longitude).toBeCloseTo(-61.0788454, 5);
    expect(dive.gas).toEqual({
      heliumPercent: 0,
      label: "Air",
      nitrogenPercent: 79,
      oxygenPercent: 21,
      padiValue: "Air",
    });
    expect(dive.startPressureBar).toBe(223.59);
    expect(dive.endPressureBar).toBe(65.29);
    expect(dive.bottomTemperatureCelsius).toBe(28);
    expect(dive.surfaceTemperatureCelsius).toBe(29);
    expect(dive.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("opens a Garmin Connect ZIP containing one FIT dive", async () => {
    const archive = zipSync({ "123456/activity.fit": createGarminDiveFit() });
    const file = new File([Uint8Array.from(archive).buffer], "garmin-connect-export.zip");

    const dive = await parseGarminDiveFile(file);

    expect(dive.maxDepthMeters).toBe(17.646);
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
