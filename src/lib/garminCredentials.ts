const GARMIN_API_KEY_STORAGE_KEY = "garminPersonalApiKey";

export async function getGarminApiKey(): Promise<string | undefined> {
  const stored = await chrome.storage.local.get(GARMIN_API_KEY_STORAGE_KEY);
  const value: unknown = stored[GARMIN_API_KEY_STORAGE_KEY];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export async function saveGarminApiKey(apiKey: string): Promise<void> {
  await chrome.storage.local.set({ [GARMIN_API_KEY_STORAGE_KEY]: apiKey.trim() });
}

export async function clearGarminApiKey(): Promise<void> {
  await chrome.storage.local.remove(GARMIN_API_KEY_STORAGE_KEY);
}
