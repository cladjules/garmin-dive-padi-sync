import { afterEach, describe, expect, it, vi } from "vitest";

type StoredValues = Record<string, unknown>;

function jwt(exp: number): string {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ exp })}.signature`;
}

function installChrome(initial: StoredValues = {}): {
  readonly actionListener: ReturnType<typeof vi.fn>;
  readonly installedListener: ReturnType<typeof vi.fn>;
  readonly listener: ReturnType<typeof vi.fn>;
  readonly remove: ReturnType<typeof vi.fn>;
  readonly set: ReturnType<typeof vi.fn>;
  readonly values: StoredValues;
} {
  const values = { ...initial };
  const listener = vi.fn();
  const installedListener = vi.fn();
  const actionListener = vi.fn();
  const get = vi.fn((key: string) => Promise.resolve({ [key]: values[key] }));
  const set = vi.fn((changes: StoredValues) => {
    Object.assign(values, changes);
    return Promise.resolve();
  });
  const remove = vi.fn((keys: string | string[]) => {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      delete values[key];
    }
    return Promise.resolve();
  });

  vi.stubGlobal("chrome", {
    action: { onClicked: { addListener: actionListener } },
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
      onInstalled: { addListener: installedListener },
      onMessage: { addListener: listener },
      openOptionsPage: vi.fn(() => Promise.resolve()),
    },
    storage: { local: { get, remove, set } },
    tabs: { create: vi.fn(() => Promise.resolve()) },
  });
  return { actionListener, installedListener, listener, remove, set, values };
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("Garmin background sync", () => {
  it("returns recent Garmin dives without relying on local import history", async () => {
    const storage = installChrome({
      garminPersonalApiKey: "personal-key",
      importedGarminActivityIds: { "1002": "2026-10-25T00:00:00.000Z" },
    });
    const archive = Uint8Array.from([80, 75, 3, 4]);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(jwt(Math.floor(Date.now() / 1000) + 86_400), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { activityId: 1002, activityName: "Already imported" },
            { activityId: 1001, activityName: "Latest new dive", locationName: "Moalboal" },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(archive, { status: 200 }));
    vi.stubGlobal("fetch", fetcher);

    const { handleGarminRuntimeRequest } = await import("../src/background");
    const listResult = await handleGarminRuntimeRequest({ type: "garmin:list-dives" });

    expect(listResult).toEqual({
      activities: [
        {
          activityId: "1002",
          activityName: "Already imported",
          beginTimestamp: undefined,
          bottomTimeSeconds: undefined,
          locationName: undefined,
          maxDepthCentimeters: undefined,
          startTimeLocal: undefined,
        },
        {
          activityId: "1001",
          activityName: "Latest new dive",
          beginTimestamp: undefined,
          bottomTimeSeconds: undefined,
          locationName: "Moalboal",
          maxDepthCentimeters: undefined,
          startTimeLocal: undefined,
        },
      ],
      checkedCount: 2,
      status: "dives",
    });

    const downloadResult = await handleGarminRuntimeRequest({
      activityId: "1001",
      type: "garmin:download-dive",
    });
    expect(downloadResult).toEqual({
      activityId: "1001",
      dataBase64: "UEsDBA==",
      fileName: "garmin-activity-1001.zip",
      status: "dive",
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[2]?.[0]).toContain("/activity/1001");
    expect(storage.listener).toHaveBeenCalledOnce();
  });

  it("does not persist a Personal API key that Garmin rejects", async () => {
    const storage = installChrome();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 })),
    );

    const { handleGarminRuntimeRequest } = await import("../src/background");
    const result = await handleGarminRuntimeRequest({
      apiKey: "invalid-key",
      type: "garmin:save-key-and-list",
    });

    expect(result).toMatchObject({ code: "invalid-key", status: "error" });
    expect(storage.values.garminPersonalApiKey).toBeUndefined();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it("does not persist a Personal API key when Garmin cannot validate it", async () => {
    const storage = installChrome();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 })),
    );

    const { handleGarminRuntimeRequest } = await import("../src/background");
    const result = await handleGarminRuntimeRequest({
      apiKey: "unverified-key",
      type: "garmin:save-key-and-list",
    });

    expect(result).toMatchObject({ status: "error" });
    expect(storage.values.garminPersonalApiKey).toBeUndefined();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it("registers the welcome page and toolbar settings entry points", async () => {
    const storage = installChrome();

    await import("../src/background");

    expect(storage.installedListener).toHaveBeenCalledOnce();
    expect(storage.actionListener).toHaveBeenCalledOnce();

    const onInstalled = storage.installedListener.mock.calls[0]?.[0] as (
      details: chrome.runtime.InstalledDetails,
    ) => void;
    onInstalled({ reason: "install" });
    expect(storage.remove).toHaveBeenCalledWith([
      "importedDiveFingerprints",
      "importedGarminActivityIds",
    ]);
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: "chrome-extension://test/settings.html?welcome=1",
    });

    const onAction = storage.actionListener.mock.calls[0]?.[0] as () => void;
    onAction();
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledOnce();
  });
});
