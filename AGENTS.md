# Project guidance

## Feature index

- [Garmin dive sync into PADI](docs/features/garmin-fit-import.md)
- [Extension welcome and settings](docs/features/extension-onboarding.md)
- [Chrome Web Store listing kit](docs/features/chrome-web-store-listing.md)

## Durable decisions

- Keep FIT parsing local; do not upload dive profiles to an application backend.
- Never collect or persist PADI credentials or tokens. Use only the active PADI browser session for an explicit user-confirmed import.
- Treat PADI GraphQL as an unofficial, unstable adapter behind `src/lib/padiClient.ts`.
- PADI persists measurement fields in metric units even when the user's display preference is imperial.
- Import recreational logs only until the PADI training-dive verification contract is explicitly supported.
- Never persist duplicate history. Compare the newest Garmin dives with a bounded live PADI logbook read using the normalized dive date as the primary identity; use maximum depth and bottom time only to pair multiple dives from the same day one-to-one. Keep FIT fingerprints only in memory for the active batch.
- Use Garmin's official Personal API from the Manifest V3 background worker. Store the user-created read-only API key in extension-local storage and keep exchanged bearer tokens in worker memory only.
- Automatic sync scans at most the 50 newest Garmin dives and offers up to 20 unmatched dives per reviewed batch. Downloads and PADI writes run sequentially, and the extension refreshes the live PADI duplicate check under a cross-tab lock immediately before writing.
- Treat a PADI create mutation as confirmed when it returns either a created row or a positive `affected_rows` count. Never claim an ambiguous mutation imported nothing; tell the diver to refresh before retrying. Reload PADI when the diver dismisses completed import results.
- Open the extension-owned settings page after first install and from the toolbar action. It may report whether a Garmin key exists, but must never read the saved key back into the UI.
- For the current Chrome Web Store privacy form, select Authentication information, Location, and Website content only. DiveBridge does not handle biometric or medical data and does not monitor browser user activity.
- Use the aqua dive-watch-to-red-PADI-badge DiveBridge mark from `extension/icons/` for extension identity and toolbar surfaces; preserve its transparent rounded corners at all exported sizes.
- Put the full-width **What this extension stores** privacy summary above the setup flow. Present setup as two numbered cards—Garmin connection first and PADI import second—with equal columns and equal height on desktop; stack them in order at natural height on narrow screens.
- Keep the PADI setup card and header shortcut muted and disabled until the current settings state confirms Garmin is connected; label the locked state **Connect Garmin first** and unlock it immediately after validation.
- Style the unlocked PADI setup step with DiveBridge aqua/teal accents. Reserve red for errors, warnings, and destructive actions rather than ordinary navigation.
- Keep the official Garmin Personal API destination as a prominent setup call-to-action adjacent to the key field; do not reduce it to an inline text link.
- Keep Chrome Web Store copy, privacy disclosures, reviewer instructions, and generated screenshots under `store/`. Never commit reviewer credentials or API keys; deploy only the static privacy/support site publicly.
- Keep repository fixtures, screenshots, and examples synthetic and identity-neutral. Never use a developer's name, personal locations, real dive dates, coordinates, or profile values as sample data.
