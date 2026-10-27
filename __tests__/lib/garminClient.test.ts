import { afterEach, describe, expect, it, vi } from "vitest";

import {
  arrayBufferToBase64,
  downloadGarminActivity,
  exchangeGarminApiKey,
  GARMIN_ACTIVITY_LIMIT,
  GarminClientError,
  listGarminDives,
  MAX_GARMIN_DOWNLOAD_BYTES,
} from "../../src/lib/garminClient";

function jwt(exp: number): string {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ exp })}.signature`;
}

function fetcherReturning(response: Response): typeof fetch {
  return vi.fn(() => Promise.resolve(response));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Garmin Personal API client", () => {
  it("exchanges a Personal API key for Garmin's plain JWT response", async () => {
    const now = Date.UTC(2026, 9, 26);
    const token = jwt(Math.floor(now / 1000) + 86_400);
    const fetcher = fetcherReturning(new Response(token, { status: 200 }));

    await expect(exchangeGarminApiKey("secret-key", fetcher, now)).resolves.toEqual({
      expiresAt: now + 86_400_000,
      value: token,
    });
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("personal-api-key/token"),
      expect.objectContaining({
        headers: { Authorization: "ApiKey secret-key" },
        method: "POST",
      }),
    );
  });

  it("sanitizes invalid keys, malformed tokens, and network failures", async () => {
    await expect(
      exchangeGarminApiKey("bad", fetcherReturning(new Response(null, { status: 401 }))),
    ).rejects.toMatchObject({ code: "invalid-key" });
    await expect(
      exchangeGarminApiKey("bad", fetcherReturning(new Response("not-a-jwt", { status: 200 }))),
    ).rejects.toMatchObject({ code: "response" });
    await expect(
      exchangeGarminApiKey(
        "bad",
        vi.fn(() => Promise.reject(new Error("private provider details"))),
      ),
    ).rejects.toEqual(
      new GarminClientError(
        "Garmin could not be reached. Check your connection and retry.",
        "network",
      ),
    );
  });

  it("requests a bounded newest-first dive list and validates the response", async () => {
    const fetcher = fetcherReturning(
      new Response(
        JSON.stringify([
          {
            activityId: 9902,
            activityName: "Blue Reef",
            beginTimestamp: 1_793_000_000_000,
            locationName: "Sample Bay",
            ignoredProviderField: "ignored",
          },
        ]),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );

    await expect(listGarminDives("token", fetcher)).resolves.toEqual([
      {
        activityId: "9902",
        activityName: "Blue Reef",
        beginTimestamp: 1_793_000_000_000,
        locationName: "Sample Bay",
        startTimeLocal: undefined,
      },
    ]);

    const requestInput = vi.mocked(fetcher).mock.calls[0]?.[0];
    if (typeof requestInput !== "string") {
      throw new Error("Expected the Garmin client to request a URL string");
    }
    const requestedUrl = new URL(requestInput);
    expect(requestedUrl.searchParams.get("activityType")).toBe("diving");
    expect(requestedUrl.searchParams.get("limit")).toBe(String(GARMIN_ACTIVITY_LIMIT));
    expect(requestedUrl.searchParams.get("sortOrder")).toBe("desc");
  });

  it("rejects unauthorized and malformed activity responses", async () => {
    await expect(
      listGarminDives("expired", fetcherReturning(new Response(null, { status: 401 }))),
    ).rejects.toMatchObject({ code: "auth" });
    await expect(
      listGarminDives("token", fetcherReturning(new Response("not json", { status: 200 }))),
    ).rejects.toMatchObject({ code: "response" });
    await expect(
      listGarminDives(
        "token",
        fetcherReturning(
          new Response(JSON.stringify([{ activityId: "wrong-type" }]), { status: 200 }),
        ),
      ),
    ).rejects.toMatchObject({ code: "response" });
  });

  it("downloads a bounded activity archive and converts it for extension messaging", async () => {
    const bytes = Uint8Array.from([80, 75, 3, 4]).buffer;
    const fetcher = fetcherReturning(new Response(bytes, { status: 200 }));

    const downloaded = await downloadGarminActivity("token", "9902", fetcher);
    expect(new Uint8Array(downloaded)).toEqual(new Uint8Array(bytes));
    expect(arrayBufferToBase64(downloaded)).toBe("UEsDBA==");
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/download-service/files/activity/9902"),
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
    );
  });

  it("rejects empty, oversized, and unauthorized activity downloads", async () => {
    await expect(
      downloadGarminActivity("token", "1", fetcherReturning(new Response(null, { status: 401 }))),
    ).rejects.toMatchObject({ code: "auth" });
    await expect(
      downloadGarminActivity("token", "1", fetcherReturning(new Response(null, { status: 200 }))),
    ).rejects.toMatchObject({ code: "response" });
    await expect(
      downloadGarminActivity(
        "token",
        "1",
        fetcherReturning(
          new Response(Uint8Array.from([1]), {
            headers: { "content-length": String(MAX_GARMIN_DOWNLOAD_BYTES + 1) },
            status: 200,
          }),
        ),
      ),
    ).rejects.toMatchObject({ code: "file-too-large" });
  });
});
