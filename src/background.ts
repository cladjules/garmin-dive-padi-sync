import { clearGarminApiKey, getGarminApiKey, saveGarminApiKey } from "./lib/garminCredentials";
import {
  arrayBufferToBase64,
  downloadGarminActivity,
  exchangeGarminApiKey,
  GarminClientError,
  listGarminDives,
} from "./lib/garminClient";
import {
  GarminRuntimeRequestSchema,
  type GarminAccessToken,
  type GarminRuntimeRequest,
  type GarminRuntimeResponse,
} from "./types/garmin";

const TOKEN_REFRESH_MARGIN_MS = 60 * 60 * 1000;

let cachedApiKey: string | undefined;
let cachedAccessToken: GarminAccessToken | undefined;

function clearCachedAccessToken(): void {
  cachedApiKey = undefined;
  cachedAccessToken = undefined;
}

async function accessToken(apiKey: string, forceRefresh = false): Promise<string> {
  if (
    !forceRefresh &&
    cachedApiKey === apiKey &&
    cachedAccessToken &&
    cachedAccessToken.expiresAt > Date.now() + TOKEN_REFRESH_MARGIN_MS
  ) {
    return cachedAccessToken.value;
  }

  const next = await exchangeGarminApiKey(apiKey);
  cachedApiKey = apiKey;
  cachedAccessToken = next;
  return next.value;
}

function safeError(error: unknown): GarminRuntimeResponse {
  if (error instanceof GarminClientError) {
    return {
      code: error.code === "auth" ? "invalid-key" : error.code,
      message:
        error.code === "auth"
          ? "Garmin authorization expired. Replace your Personal API key and retry."
          : error.message,
      status: "error",
    };
  }

  return {
    code: "unexpected",
    message: "The Garmin dive could not be prepared. Nothing was imported.",
    status: "error",
  };
}

async function listImportableDives(apiKey: string): Promise<GarminRuntimeResponse> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const token = await accessToken(apiKey, attempt > 0);
      const activities = await listGarminDives(token);
      if (activities.length === 0) {
        return { status: "no-dives" };
      }

      return {
        activities: [...activities],
        checkedCount: activities.length,
        status: "dives",
      };
    } catch (error) {
      if (error instanceof GarminClientError && error.code === "auth" && attempt === 0) {
        clearCachedAccessToken();
        continue;
      }
      return safeError(error);
    }
  }

  return safeError(undefined);
}

async function downloadDive(apiKey: string, activityId: string): Promise<GarminRuntimeResponse> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const token = await accessToken(apiKey, attempt > 0);
      const bytes = await downloadGarminActivity(token, activityId);
      return {
        activityId,
        dataBase64: arrayBufferToBase64(bytes),
        fileName: `garmin-activity-${activityId}.zip`,
        status: "dive",
      };
    } catch (error) {
      if (error instanceof GarminClientError && error.code === "auth" && attempt === 0) {
        clearCachedAccessToken();
        continue;
      }
      return safeError(error);
    }
  }

  return safeError(undefined);
}

export async function handleGarminRuntimeRequest(
  request: GarminRuntimeRequest,
): Promise<GarminRuntimeResponse> {
  if (request.type === "garmin:get-connection") {
    return { configured: (await getGarminApiKey()) !== undefined, status: "connection" };
  }

  if (request.type === "garmin:disconnect") {
    await clearGarminApiKey();
    clearCachedAccessToken();
    return { status: "disconnected" };
  }

  if (request.type === "garmin:save-key-and-list") {
    clearCachedAccessToken();
    const result = await listImportableDives(request.apiKey);
    if (result.status !== "error") {
      await saveGarminApiKey(request.apiKey);
    }
    return result;
  }

  const apiKey = await getGarminApiKey();
  if (!apiKey) {
    return { status: "setup-required" };
  }
  return request.type === "garmin:download-dive"
    ? downloadDive(apiKey, request.activityId)
    : listImportableDives(apiKey);
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const request = GarminRuntimeRequestSchema.safeParse(message);
  if (!request.success) {
    return false;
  }

  void handleGarminRuntimeRequest(request.data)
    .then(sendResponse)
    .catch((error: unknown) => sendResponse(safeError(error)));
  return true;
});

chrome.runtime.onInstalled.addListener((details) => {
  void chrome.storage.local.remove(["importedDiveFingerprints", "importedGarminActivityIds"]);
  if (details.reason === "install") {
    void chrome.tabs.create({ url: chrome.runtime.getURL("settings.html?welcome=1") });
  }
});

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});
