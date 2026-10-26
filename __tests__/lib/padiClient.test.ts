import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPadiDive,
  findPadiSession,
  getPadiUnitSystem,
  listRecentPadiDives,
} from "../../src/lib/padiClient";
import type { EditablePadiDive } from "../../src/types/dive";

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  public get length(): number {
    return this.#values.size;
  }

  public clear(): void {
    this.#values.clear();
  }

  public getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.#values.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

function token(claims: object): string {
  const encode = (value: object): string =>
    btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `${encode({ alg: "none" })}.${encode(claims)}.signature`;
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("findPadiSession", () => {
  it("finds the current PADI Cognito token without collecting credentials", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "CognitoIdentityServiceProvider.client.user.idToken",
      token({
        aud: "7l7c6rgndimr802cfhva7akdsh",
        "custom:affiliate_id": "4242",
        exp: 4_102_444_800,
      }),
    );

    expect(findPadiSession(storage)).toMatchObject({ affiliateId: 4242 });
  });

  it("rejects expired PADI sessions", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "CognitoIdentityServiceProvider.client.user.idToken",
      token({
        "custom:affiliate_id": "4242",
        exp: 1,
      }),
    );

    expect(() => findPadiSession(storage)).toThrow("Sign in to PADI again");
  });
});

describe("PADI GraphQL client", () => {
  const session = { affiliateId: 4242, idToken: "header.payload.signature" };

  it("reads the user's PADI unit preference", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: { logbook_units_settings: [{ unit: "Imperial" }] },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPadiUnitSystem(session)).resolves.toBe("Imperial");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("defaults to metric when the PADI account has no saved unit preference", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: { logbook_units_settings: [] },
        }),
      ),
    );

    await expect(getPadiUnitSystem(session)).resolves.toBe("Metric");
  });

  it("reads a bounded set of recent PADI logs for duplicate reconciliation", async () => {
    const existing = {
      depth_times: [{ bottom_time: 52, max_depth: 17.6 }],
      dive_date: "2026-10-25",
      id: 991,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: { logbook_logs: [existing] },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listRecentPadiDives(session)).resolves.toEqual([existing]);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(typeof request.body).toBe("string");
    const body = JSON.parse(request.body as string) as {
      query: string;
      variables: { affiliate_id: number; limit: number };
    };
    expect(body.query).toContain("depth_times");
    expect(body.query).not.toContain("experiences");
    expect(body.variables).toEqual({
      affiliate_id: 4242,
      limit: 500,
    });
  });

  it("creates a recreational dive and converts displayed imperial values back to metric", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          insert_logbook_logs: {
            affected_rows: 1,
            returning: [{ id: 991, status: "Publish" }],
          },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const dive: EditablePadiDive = {
      bottomTemperature: 82.4,
      bottomTimeMinutes: 52,
      date: "2023-11-22",
      diveType: "Boat",
      endPressure: 946.9,
      gas: {
        heliumPercent: 0,
        label: "EANx32",
        nitrogenPercent: 68,
        oxygenPercent: 32,
        padiValue: "Enriched_32",
      },
      location: "Sardine Run, Moalboal",
      maxDepth: 57.9,
      notes: "Imported from Garmin Dive.",
      startPressure: 3242.9,
      surfaceTemperature: 84.2,
      title: "Dive #803",
      unitSystem: "Imperial",
    };

    await expect(createPadiDive(session, dive, "Publish")).resolves.toEqual({
      id: 991,
      status: "Publish",
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    if (typeof request.body !== "string") {
      throw new Error("Expected the GraphQL body to be a JSON string");
    }
    const body = JSON.parse(request.body) as {
      variables: {
        general: Array<{
          conditions: { data: { bottom_water_temp: number } };
          depth_times: { data: { max_depth: number } };
          equipment: {
            data: { gas_mixture: string; starting_pressure: number };
          };
        }>;
      };
    };
    const created = body.variables.general[0];

    expect(request.headers).toMatchObject({ Authorization: "Bearer header.payload.signature" });
    expect(created?.depth_times.data.max_depth).toBeCloseTo(17.648, 3);
    expect(created?.conditions.data.bottom_water_temp).toBe(28);
    expect(created?.equipment.data.starting_pressure).toBeCloseTo(223.59, 2);
    expect(created?.equipment.data.gas_mixture).toBe("Enriched_32");
  });

  it("accepts a successful insert count when PADI omits the returned row", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: {
            insert_logbook_logs: {
              affected_rows: 1,
              returning: [],
            },
          },
        }),
      ),
    );

    await expect(
      createPadiDive(
        session,
        {
          bottomTimeMinutes: 52,
          date: "2023-11-22",
          diveType: "Boat",
          location: "Moalboal",
          maxDepth: 17.6,
          notes: "",
          title: "Single-Gas Dive",
          unitSystem: "Metric",
        },
        "Publish",
      ),
    ).resolves.toEqual({ status: "Publish" });
  });

  it("warns that an unconfirmed mutation may still have created the dive", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: {
            insert_logbook_logs: {
              affected_rows: 0,
              returning: [],
            },
          },
        }),
      ),
    );

    await expect(
      createPadiDive(
        session,
        {
          bottomTimeMinutes: 52,
          date: "2023-11-22",
          diveType: "Boat",
          location: "Moalboal",
          maxDepth: 17.6,
          notes: "",
          title: "Single-Gas Dive",
          unitSystem: "Metric",
        },
        "Publish",
      ),
    ).rejects.toThrow("Refresh your PADI logbook before retrying");
  });

  it("returns a sanitized error when PADI rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ internal: "secret" }, 500)));

    await expect(getPadiUnitSystem(session)).rejects.toThrow(
      "PADI did not accept the request. Nothing was imported.",
    );
  });
});
