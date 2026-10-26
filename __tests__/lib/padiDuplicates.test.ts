import { describe, expect, it } from "vitest";

import { findPadiDuplicate, matchPadiDuplicates } from "../../src/lib/padiDuplicates";
import type { PadiExistingDive } from "../../src/types/padi";

function padiLog(overrides: Partial<PadiExistingDive> = {}): PadiExistingDive {
  return {
    depth_times: [{ bottom_time: 52, max_depth: 17.6 }],
    dive_date: "2026-10-25",
    id: 991,
    ...overrides,
  };
}

describe("PADI duplicate reconciliation", () => {
  it("uses the date as the primary duplicate signal", () => {
    const existing = padiLog();

    expect(
      findPadiDuplicate(
        {
          bottomTimeMinutes: 90,
          localDate: "2026-10-25T08:30:00",
          maxDepthMeters: 35,
        },
        [existing],
      ),
    ).toBe(existing);
  });

  it("does not match a dive on a different date or without a date", () => {
    const existing = padiLog();

    expect(
      findPadiDuplicate({ bottomTimeMinutes: 52, localDate: "2026-10-24", maxDepthMeters: 17.6 }, [
        existing,
      ]),
    ).toBeUndefined();
    expect(findPadiDuplicate({}, [existing])).toBeUndefined();
  });

  it("uses depth and duration to pair multiple dives on the same date one-to-one", () => {
    const shallow = padiLog({
      depth_times: [{ bottom_time: 48, max_depth: 12 }],
      id: 991,
    });
    const deep = padiLog({
      depth_times: [{ bottom_time: 35, max_depth: 28 }],
      id: 992,
    });

    const matches = matchPadiDuplicates(
      [
        { bottomTimeMinutes: 36, localDate: "2026-10-25", maxDepthMeters: 27.5 },
        { bottomTimeMinutes: 49, localDate: "2026-10-25", maxDepthMeters: 12.3 },
        { bottomTimeMinutes: 55, localDate: "2026-10-25", maxDepthMeters: 18 },
      ],
      [shallow, deep],
    );

    expect(matches).toEqual([deep, shallow, undefined]);
  });

  it("normalizes slash-formatted PADI dates", () => {
    const existing = padiLog({ dive_date: "10/25/2026" });

    expect(findPadiDuplicate({ localDate: "2026-10-25" }, [existing])).toBe(existing);
  });
});
