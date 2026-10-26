# Garmin dive sync into PADI

## Purpose

The browser extension finds unimported Garmin dives and imports a reviewed batch into the logged-in user's PADI recreational logbook. It removes export and repeated-entry work while keeping an explicit confirmation before any PADI write.

## User flow

1. The watch syncs with Garmin Dive or Garmin Connect on the phone over Bluetooth. Garmin uploads the saved dive to Garmin Connect.
2. On first use, the diver creates a revocable Personal API key in Garmin Connect and pastes it into the extension.
3. The diver signs in to `learning.padi.com` and selects **Import Garmin dives**.
4. The background worker exchanges the key for a short-lived bearer token and requests the newest 50 dive summaries. The content script reads up to 500 recent PADI logs of any type and removes live date matches before offering up to 20 candidates.
5. The diver selects the dives to import and continues to the duplicate check. Archives are downloaded sequentially, their FIT files are parsed locally, and the same live PADI match is applied to the complete metrics.
6. A batch review form shows the mapped PADI fields. Each dive can be included or excluded, and its title, location, and boat/shore entry type can be edited.
7. After explicit confirmation, the extension acquires a PADI-origin browser lock, refreshes the live log list, and creates confirmed nonduplicates sequentially.
8. No duplicate history is persisted. A FIT SHA-256 fingerprint prevents repeats only inside the active batch, while PADI remains the source of truth between sessions.
9. Dismissing completed results reloads the PADI page so the new logs appear in the native logbook list.

The adjacent options menu keeps manual `.fit` and single-FIT `.zip` selection as a fallback.

## Architecture and key files

- `extension/manifest.json`: Manifest V3 permissions, background worker, and PADI page injection.
- `src/background.ts`: Garmin credential, token-cache, activity selection, and download orchestration.
- `src/content.tsx`: browser workflow and state transitions.
- `src/lib/garminClient.ts`: bounded official Garmin Personal API adapter.
- `src/lib/garminCredentials.ts`: extension-local Personal API key storage.
- `src/lib/fitParser.ts`: bounded FIT/ZIP parsing and Garmin-to-domain mapping.
- `src/lib/conversions.ts`: metric/imperial display and PADI-storage conversion.
- `src/lib/padiClient.ts`: PADI session discovery and GraphQL adapter.
- `src/lib/padiDuplicates.ts`: date-primary one-to-one matching and cross-tab import lock.
- `src/components/garminSetupDialog.tsx`: one-time key setup and disconnect UI.
- `src/components/importDialog.tsx`: accessible single-file review and confirmation UI.
- `src/components/batchSyncDialog.tsx`: bulk selection, duplicate-check, review, progress, and results UI.
- `scripts/build.mjs`: deterministic browser bundle.

## External contracts

### Garmin Personal API

Base URL: `https://personal.connectapi.garmin.com`.

- `POST /personalapitoken-service/personal-api/personal-api-key/token`
  - Purpose: exchange the user's Personal API key for a bearer JWT.
  - Auth: `Authorization: ApiKey <key>`.
  - Response: plain JWT. It is cached only in background-worker memory and reused until one hour before expiry.
  - Errors: 401/403 means the key is invalid or expired; the user sees a sanitized replacement prompt.
- `GET /activitylist-service/activities/search/activities`
  - Purpose: retrieve recent dive summaries.
  - Auth: `Authorization: Bearer <token>`.
  - Params: `activityType=diving`, `excludeChildren=true`, `sortOrder=desc`, `start=0`, `limit=50`.
  - Response: validated summary array; only the fields needed for selection and ordering are retained. At most 20 unimported summaries are exposed to one UI batch.
- `GET /download-service/files/activity/{activityId}`
  - Purpose: download the original activity archive for a selected dive after confirmation to check it.
  - Auth: `Authorization: Bearer <token>`.
  - Response: ZIP bytes, limited to 25 MiB before extension messaging and parsing.

Garmin documents Personal API setup at <https://developer.garmin.com/gc-developer-program/personal/personal-api/> and its endpoint schema at <https://developer.garmin.com/gc-developer-program/personal/swagger-docs/>.

### Garmin FIT input

- Maximum accepted compressed or raw input size: 25 MiB.
- Accepted inputs: a FIT activity or a ZIP containing exactly one FIT activity.
- The activity must have a diving session or a FIT `dive_summary` message.
- Required mapped values: start time, maximum depth, and bottom/session time.

The parser uses `fit-file-parser` in validated-CRC mode. The downloaded or selected file is never sent to an extension backend.

### PADI read and write

The extension uses PADI's current private GraphQL endpoint at `https://divelog.global-prod.padi.com/v1/graphql`. Authentication comes from the unexpired Cognito ID token already stored by `learning.padi.com`; the token remains in memory and is never written by the extension.

Before review, and again immediately before a confirmed write, the extension reads at most 500 recent logs across all PADI log types. It requests only the log ID, dive date, maximum depth, and bottom time needed for duplicate reconciliation.

The create mutation mirrors PADI's current recreational-log form:

- general: title, location, date, boat/shore, status
- depth/time: maximum depth and bottom time
- conditions: surface and bottom water temperature
- equipment: gas mix and available tank pressures
- experience: generated Garmin/GPS notes

PADI's UI displays imperial values when configured but stores depth, temperature, and pressure in metric base units. The adapter converts reviewed imperial values back to meters, Celsius, and bar before the mutation.

All API errors shown to the user are sanitized. Provider responses, tokens, and FIT payloads are never logged.

A create is confirmed when PADI returns either a created row or a positive `affected_rows` count. Some successful PADI responses omit the returned row and therefore have no log ID for a direct **View** link. If neither signal is present, the extension treats the outcome as ambiguous and tells the diver to refresh the logbook before retrying; it never claims with certainty that nothing was imported.

## Performance and data-access budget

There is no database or application server.

- Frequency: one user-initiated operation per reviewed batch.
- Garmin read fan-out: one bounded activity-list request plus one download per selected candidate. Token exchange adds one call when no reusable background-memory token exists. There is no polling.
- Garmin cardinality: at most 50 summary rows are requested and at most 20 candidates are offered per batch. Each selected archive is capped at 25 MiB and ZIPs must contain exactly one FIT candidate.
- PADI network work: one bounded duplicate-list query at batch start, one unit query during review, one duplicate-list refresh immediately before writes, and at most one mutation per confirmed nonduplicate dive.
- Concurrency: archive downloads and PADI writes are sequential. Import controls disable during active work.
- Freshness: Garmin and PADI are queried live on every batch start. PADI duplicates are refreshed immediately before writes. Only the short-lived Garmin bearer token is cached.
- Risk weight: low for capacity, medium for external-contract stability.
- Load-test decision: no load test. The workflow is low-frequency, user initiated, and bounded; mocked contract and Chromium journey tests are the relevant gates.

## Privacy and security

- No extension backend, analytics, password collection, polling, or PADI-token persistence.
- The read-only Garmin Personal API key is stored in extension-local storage so later syncs are one click. It can expose all data available through Garmin's Personal API, so the UI treats it as a secret and supports disconnect/revocation.
- Garmin bearer tokens remain only in background-worker memory.
- The content script runs only on `learning.padi.com`.
- The user must explicitly start a sync and explicitly confirm the PADI write.
- Duplicate history is not stored. PADI comparison rows and FIT fingerprints stay only in memory for the active flow.
- The only persistent extension values are the Garmin Personal API key and the preferred Boat/Shore entry type. On install or upgrade, obsolete duplicate-history keys from development versions are removed.
- ZIP and FIT inputs are size-bounded and structurally validated.

## Duplicate behavior

- The normalized local date is the primary match. ISO timestamps and common slash-formatted PADI dates are reduced to the same calendar date.
- On dates with multiple dives, a one-to-one matcher uses the closest maximum depth and bottom time to decide which Garmin and PADI rows pair. Those measurements select the pairing but do not veto a same-date match.
- The first match runs before archives are downloaded. Matched PADI log IDs are consumed once, so a single PADI row cannot hide multiple Garmin dives. A second pass uses parsed FIT dates for activities whose summary date was unavailable.
- Immediately before PADI mutations, the extension refreshes the live logs while holding a `navigator.locks` lock shared by PADI tabs. This prevents two open review windows from writing the same batch concurrently.
- A FIT fingerprint is used only to catch identical files within the current batch and is never persisted.
- Manual file selection displays a duplicate warning. **Import again** remains an explicit override because a deliberate second log can occasionally be valid.
- The live query is bounded to 500 PADI logs and 50 Garmin activities. The review UI remains the final check for an unusually old log or two same-day dives with effectively identical metrics.

## Known risks and follow-ups

- PADI does not publish or guarantee this GraphQL contract. Keep `padiClient.ts` isolated and update it if PADI changes the web logbook.
- Garmin's Personal API is official but new. Keep `garminClient.ts` aligned with Garmin's published Swagger contract.
- Date-primary matching cannot prove identity when an unrelated PADI-only dive and Garmin dive share a day. Keep matched counts visible during review and retain the explicit manual-file override.
- A Chrome Web Store release needs final branding assets, store disclosures, and review.
- Mobile one-tap sharing requires a native iOS/Android share target or official PADI import support.
