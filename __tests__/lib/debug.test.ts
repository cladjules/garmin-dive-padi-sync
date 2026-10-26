import { afterEach, describe, expect, it, vi } from "vitest";

import { debugLog } from "../../src/lib/debug";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("debugLog", () => {
  it("logs only the supplied safe event context", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);

    debugLog("parse_completed", { hasGas: true });

    expect(debug).toHaveBeenCalledWith("[DiveBridge]", "parse_completed", { hasGas: true });
  });
});
