import type { EditablePadiDive, PadiImportResult, PadiStatus, PadiUnitSystem } from "../types/dive";
import {
  depthForPadiStorage,
  pressureForPadiStorage,
  temperatureForPadiStorage,
} from "./conversions";
import {
  PadiCreateDiveResponseSchema,
  type PadiExistingDive,
  PadiRecentDivesResponseSchema,
  type PadiSession,
  PadiTokenClaimsSchema,
  PadiUnitResponseSchema,
} from "../types/padi";

const PADI_GRAPHQL_URL = "https://divelog.global-prod.padi.com/v1/graphql";
const PADI_CLIENT_ID = "7l7c6rgndimr802cfhva7akdsh";

const UNIT_QUERY = `
  query logbook_units_settings {
    logbook_units_settings {
      unit
    }
  }
`;

const CREATE_DIVE_MUTATION = `
  mutation insert_logbook_logs($general: [logbook_logs_insert_input!]!) {
    insert_logbook_logs(objects: $general) {
      affected_rows
      returning {
        id
        status
      }
    }
  }
`;

const RECENT_DIVES_LIMIT = 500;
const RECENT_DIVES_QUERY = `
  query DiveBridgeRecentDives($affiliate_id: Int!, $limit: Int!) {
    logbook_logs(
      where: { affiliate_id: { _eq: $affiliate_id } }
      order_by: { dive_date: desc, id: desc }
      limit: $limit
    ) {
      id
      dive_date
      depth_times {
        max_depth
        bottom_time
      }
    }
  }
`;

export class PadiClientError extends Error {
  public constructor(
    message: string,
    public readonly code: "auth" | "network" | "rejected" | "response",
  ) {
    super(message);
    this.name = "PadiClientError";
  }
}

function decodeTokenPayload(token: string): unknown {
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

export function findPadiSession(storage: Storage = window.localStorage): PadiSession {
  const storageKeys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => key !== null);
  const tokens = storageKeys
    .filter((key) => key.startsWith("CognitoIdentityServiceProvider.") && key.endsWith(".idToken"))
    .map((key) => storage.getItem(key))
    .filter((token): token is string => token !== null);

  for (const idToken of tokens) {
    const result = PadiTokenClaimsSchema.safeParse(decodeTokenPayload(idToken));
    if (!result.success || result.data.exp * 1000 <= Date.now()) {
      continue;
    }

    if (result.data.aud && result.data.aud !== PADI_CLIENT_ID) {
      continue;
    }

    const affiliateId = Number(result.data["custom:affiliate_id"]);
    if (Number.isSafeInteger(affiliateId) && affiliateId > 0) {
      return { affiliateId, idToken };
    }
  }

  throw new PadiClientError("Sign in to PADI again, then retry the import.", "auth");
}

async function requestGraphql(
  session: PadiSession,
  query: string,
  variables?: object,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(PADI_GRAPHQL_URL, {
      body: JSON.stringify({ query, variables }),
      headers: {
        Authorization: `Bearer ${session.idToken}`,
        "Content-Type": "application/json",
        "x-platform": "web",
      },
      method: "POST",
    });
  } catch {
    throw new PadiClientError(
      "PADI could not be reached. Check your connection and retry.",
      "network",
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new PadiClientError("Your PADI session expired. Sign in again, then retry.", "auth");
  }

  if (!response.ok) {
    throw new PadiClientError("PADI did not accept the request. Nothing was imported.", "rejected");
  }

  try {
    return await response.json();
  } catch {
    throw new PadiClientError(
      "PADI returned an unexpected response. Nothing was imported.",
      "response",
    );
  }
}

export async function getPadiUnitSystem(session: PadiSession): Promise<PadiUnitSystem> {
  const rawResponse = await requestGraphql(session, UNIT_QUERY);
  const response = PadiUnitResponseSchema.safeParse(rawResponse);
  if (!response.success || response.data.errors?.length) {
    return "Metric";
  }

  return response.data.data.logbook_units_settings[0]?.unit ?? "Metric";
}

export async function listRecentPadiDives(
  session: PadiSession,
): Promise<readonly PadiExistingDive[]> {
  const rawResponse = await requestGraphql(session, RECENT_DIVES_QUERY, {
    affiliate_id: session.affiliateId,
    limit: RECENT_DIVES_LIMIT,
  });
  const response = PadiRecentDivesResponseSchema.safeParse(rawResponse);
  if (!response.success || response.data.errors?.length) {
    throw new PadiClientError(
      "PADI could not check your existing logbook. Nothing was imported.",
      "response",
    );
  }

  return response.data.data.logbook_logs;
}

function optionalTemperature(
  value: number | undefined,
  unitSystem: EditablePadiDive["unitSystem"],
): number | null {
  return value === undefined ? null : temperatureForPadiStorage(value, unitSystem);
}

function optionalPressure(
  value: number | undefined,
  unitSystem: EditablePadiDive["unitSystem"],
): number | null {
  return value === undefined ? null : pressureForPadiStorage(value, unitSystem);
}

function buildCreateVariables(
  session: PadiSession,
  dive: EditablePadiDive,
  status: PadiStatus,
): object {
  const now = new Date().toISOString().slice(0, 19);
  const gas = dive.gas;

  return {
    general: [
      {
        affiliate_id: session.affiliateId,
        adventure_dive: null,
        conditions: {
          data: {
            air_temp: null,
            body_of_water: null,
            bottom_water_temp: optionalTemperature(dive.bottomTemperature, dive.unitSystem),
            current: null,
            surface_water_temp: optionalTemperature(dive.surfaceTemperature, dive.unitSystem),
            surge: null,
            visibility: null,
            visibility_distance: null,
            water_type: null,
            wave_condition: null,
            weather: null,
          },
        },
        created_date: now,
        depth_times: {
          data: {
            bottom_time: dive.bottomTimeMinutes,
            max_depth: depthForPadiStorage(dive.maxDepth, dive.unitSystem),
          },
        },
        dive_date: dive.date,
        dive_location: dive.location.trim(),
        dive_title: dive.title.trim(),
        dive_type: dive.diveType,
        equipment: {
          data: {
            additional_equipment: null,
            cylinder_size: null,
            cylinder_type: null,
            ending_pressure: optionalPressure(dive.endPressure, dive.unitSystem),
            gas_mixture: gas?.padiValue ?? null,
            helium: gas?.heliumPercent ?? null,
            nitrogen: gas?.nitrogenPercent ?? null,
            oxygen: gas?.oxygenPercent ?? null,
            starting_pressure: optionalPressure(dive.startPressure, dive.unitSystem),
            suit_type: null,
            weight: null,
            weight_type: null,
          },
        },
        experiences: {
          data: {
            buddies: null,
            dive_center: null,
            feeling: null,
            notes: dive.notes.trim() || null,
          },
        },
        log_course: null,
        log_number: null,
        log_type: "Recreational",
        memsys_member_number: null,
        status,
        update_date: now,
      },
    ],
  };
}

export async function createPadiDive(
  session: PadiSession,
  dive: EditablePadiDive,
  status: PadiStatus,
): Promise<PadiImportResult> {
  const rawResponse = await requestGraphql(
    session,
    CREATE_DIVE_MUTATION,
    buildCreateVariables(session, dive, status),
  );
  const response = PadiCreateDiveResponseSchema.safeParse(rawResponse);
  if (!response.success || response.data.errors?.length) {
    throw new PadiClientError(
      "PADI could not create this log entry. Nothing was imported.",
      "response",
    );
  }

  const created = response.data.data.insert_logbook_logs.returning[0];
  const affectedRows = response.data.data.insert_logbook_logs.affected_rows;
  if (created) {
    return { id: created.id, status };
  }

  if (affectedRows > 0) {
    return { status };
  }

  throw new PadiClientError(
    "PADI returned an incomplete confirmation. Refresh your PADI logbook before retrying because the dive may already be there.",
    "response",
  );
}
