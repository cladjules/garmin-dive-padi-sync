import { z } from "zod";

import {
  GarminActivityListSchema,
  type GarminAccessToken,
  type GarminActivitySummary,
} from "../types/garmin";

const GARMIN_API_ORIGIN = "https://personal.connectapi.garmin.com";
const TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token";
const ACTIVITY_LIST_PATH = "/activitylist-service/activities/search/activities";
const DOWNLOAD_PATH = "/download-service/files/activity";
const MAX_ACTIVITY_RESPONSE_CHARACTERS = 2 * 1024 * 1024;
export const MAX_GARMIN_DOWNLOAD_BYTES = 25 * 1024 * 1024;
export const GARMIN_ACTIVITY_LIMIT = 50;

const JwtClaimsSchema = z.object({ exp: z.number().int().positive() });

type GarminClientErrorCode = "auth" | "file-too-large" | "invalid-key" | "network" | "response";

export class GarminClientError extends Error {
  public constructor(
    message: string,
    public readonly code: GarminClientErrorCode,
  ) {
    super(message);
    this.name = "GarminClientError";
  }
}

function decodeJwtClaims(token: string): unknown {
  const encodedPayload = token.split(".")[1];
  if (!encodedPayload) {
    return undefined;
  }

  try {
    const base64 = encodedPayload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return undefined;
  }
}

async function garminFetch(
  fetcher: typeof fetch,
  input: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetcher(input, { ...init, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new GarminClientError(
      "Garmin could not be reached. Check your connection and retry.",
      "network",
    );
  }
}

function throwForDataStatus(response: Response): void {
  if (response.status === 401 || response.status === 403) {
    throw new GarminClientError("Garmin authorization expired.", "auth");
  }

  if (!response.ok) {
    throw new GarminClientError("Garmin did not return your dives. Retry in a moment.", "response");
  }
}

export async function exchangeGarminApiKey(
  apiKey: string,
  fetcher: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<GarminAccessToken> {
  const response = await garminFetch(fetcher, `${GARMIN_API_ORIGIN}${TOKEN_PATH}`, {
    headers: { Authorization: `ApiKey ${apiKey}` },
    method: "POST",
  });

  if (response.status === 401 || response.status === 403) {
    throw new GarminClientError(
      "Garmin rejected this Personal API key. Create or paste a current key and retry.",
      "invalid-key",
    );
  }

  if (!response.ok) {
    throw new GarminClientError(
      "Garmin could not connect this key right now. Retry in a moment.",
      "response",
    );
  }

  const value = (await response.text()).trim();
  const claims = JwtClaimsSchema.safeParse(decodeJwtClaims(value));
  if (!claims.success || claims.data.exp * 1000 <= now) {
    throw new GarminClientError(
      "Garmin returned an unexpected authorization response.",
      "response",
    );
  }

  return { expiresAt: claims.data.exp * 1000, value };
}

export async function listGarminDives(
  accessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<readonly GarminActivitySummary[]> {
  const url = new URL(`${GARMIN_API_ORIGIN}${ACTIVITY_LIST_PATH}`);
  url.searchParams.set("activityType", "diving");
  url.searchParams.set("excludeChildren", "true");
  url.searchParams.set("limit", String(GARMIN_ACTIVITY_LIMIT));
  url.searchParams.set("sortOrder", "desc");
  url.searchParams.set("start", "0");

  const response = await garminFetch(fetcher, url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: "GET",
  });
  throwForDataStatus(response);

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_ACTIVITY_RESPONSE_CHARACTERS) {
    throw new GarminClientError("Garmin returned more activity data than expected.", "response");
  }

  const text = await response.text();
  if (text.length > MAX_ACTIVITY_RESPONSE_CHARACTERS) {
    throw new GarminClientError("Garmin returned more activity data than expected.", "response");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new GarminClientError("Garmin returned an unexpected activity response.", "response");
  }

  const parsed = GarminActivityListSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GarminClientError("Garmin returned an unexpected activity response.", "response");
  }

  return parsed.data.map((activity) => ({
    activityId: String(activity.activityId),
    activityName: activity.activityName,
    beginTimestamp: activity.beginTimestamp,
    bottomTimeSeconds: activity.bottomTime,
    locationName: activity.locationName,
    maxDepthCentimeters: activity.maxDepth,
    startTimeLocal: activity.startTimeLocal,
  }));
}

export async function downloadGarminActivity(
  accessToken: string,
  activityId: string,
  fetcher: typeof fetch = fetch,
): Promise<ArrayBuffer> {
  const response = await garminFetch(
    fetcher,
    `${GARMIN_API_ORIGIN}${DOWNLOAD_PATH}/${encodeURIComponent(activityId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      method: "GET",
    },
  );
  throwForDataStatus(response);

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_GARMIN_DOWNLOAD_BYTES) {
    throw new GarminClientError(
      "This Garmin dive export is too large to import safely.",
      "file-too-large",
    );
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0) {
    throw new GarminClientError("Garmin returned an empty dive export.", "response");
  }
  if (bytes.byteLength > MAX_GARMIN_DOWNLOAD_BYTES) {
    throw new GarminClientError(
      "This Garmin dive export is too large to import safely.",
      "file-too-large",
    );
  }

  return bytes;
}

export function arrayBufferToBase64(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  const chunkSize = 32_768;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}
