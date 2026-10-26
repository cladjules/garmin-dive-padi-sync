# Garmin Dive → PADI

Review and import dives from a Garmin watch into the PADI web logbook without retyping depth, time, gas, temperature, or tank pressure.

This repository contains a privacy-first Chrome/Edge extension. Your watch syncs to Garmin through the Garmin Dive or Garmin Connect phone app as usual. The extension then uses Garmin's official Personal API to find recent dives, compares them with the live PADI logbook, lets the diver review the unmatched batch, and creates recreational PADI logs using the PADI session already open in the browser.

## What works

- A guided choose → duplicate check → review → import flow for up to 20 dives at a time
- Garmin's official, read-only Personal API with a revocable user key
- Garmin FIT and single-dive Garmin Connect ZIP files as a fallback
- Correct local dive date and start time
- Maximum and average depth
- Bottom time, rounded up to the next minute
- GPS exit or entry coordinates
- Surface and bottom temperature
- Air, enriched air, and trimix composition
- Start and end tank pressure when recorded by a Garmin transmitter
- PADI metric and imperial display settings
- Publish immediately or save as a draft
- Automatic duplicate prevention using the dive date, with depth and bottom time to pair same-day dives

The FIT file is processed locally. The extension never asks for, stores, or transmits a Garmin or PADI password. It stores the user's read-only Garmin Personal API key in extension-local browser storage and reads the current PADI login token from PADI's own browser storage only during an explicit import.

## Install for local use

Requirements: Node.js 24+ and pnpm.

```bash
pnpm install
pnpm build
```

Then in Chrome or Edge:

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository's `dist` directory.
5. The DiveBridge welcome page opens automatically. Follow it to connect Garmin.
6. Sign in at [PADI Learning](https://learning.padi.com/logbook).

The **Import Garmin dives →** button appears at the bottom-right of PADI Learning.

## Connect once

1. On the welcome page, open [Garmin Connect's Personal API page](https://connect.garmin.com/app/settings/personalApiToken).
2. Choose **Create Key**, accept Garmin's terms, choose an expiry, and copy the key. Garmin displays it only once.
3. Paste the key into DiveBridge and choose **Connect Garmin**.
4. Open [PADI Learning](https://learning.padi.com/logbook) and choose **Import Garmin dives**.

The key remains only in this browser extension. Click the DiveBridge toolbar icon to reopen settings, replace the key, or disconnect Garmin. You can also revoke the key in Garmin Connect at any time.

## Import your dives

1. Finish and save the dive on the watch.
2. Let the watch sync over Bluetooth with Garmin Dive or Garmin Connect on the phone.
3. Open PADI Learning and choose **Import Garmin dives**.
4. Select the dives you want and choose **Continue: check duplicates**.
5. Review the titles, locations, and boat/shore entry type.
6. Choose **Import all selected dives** and keep the tab open until the results appear.
7. Choose **Done** to refresh PADI and display the newly imported logs.

The extension checks the newest 50 Garmin dive activities against up to 500 recent PADI logs of any type and offers up to 20 unmatched dives in each batch. The normalized dive date is the primary match. When several dives share a date, maximum depth and bottom time pair them one-to-one so one PADI log cannot hide several Garmin dives. Immediately before writing, the extension refreshes the PADI list while holding a browser-wide import lock, then creates each confirmed log sequentially.

No duplicate history is saved. Existing PADI rows are the source of truth, and the FIT fingerprint exists only in memory while the current batch is open. The only persistent extension settings are the revocable Garmin Personal API key and the last Boat/Shore choice. Upgrades also delete the two legacy duplicate-history keys used by earlier development builds.

## File fallback

Choose **⋯ → Choose a FIT or ZIP file** beside the sync button when API access is unavailable or a specific older dive is needed.

- Garmin Dive phone app: **You → Dive Logs → select dive → ⋯ → Export Dive as FIT File**.
- Garmin Connect web: **Activities → All Activities → select dive → gear icon → Export File**.

Garmin's official export instructions are available at <https://support.garmin.com/en-SG/?faq=NxZWyZYGqL17VNBMKDUjb5>.

## Development

```bash
pnpm dev             # local interactive webpage at http://localhost:5173
pnpm dev:extension   # rebuild the unpacked extension while source files change
pnpm build:web       # static webpage build in web-dist/
pnpm test            # unit and component tests
pnpm test:coverage   # coverage report
pnpm test:browser    # headed Chromium extension smoke test
pnpm verify          # lint, format, type-check, tests, and production build
pnpm package         # build release/garmin-dive-padi-sync-v0.5.7.zip
```

The local webpage uses sample dives so the complete choose → duplicate check → review → import journey can be developed without touching an account. Live Garmin and PADI access remains in the extension: a localhost page cannot safely access the authenticated PADI session on another origin, and this project never asks for a PADI password or token.

Run `pnpm exec playwright install chromium` once before the browser smoke test.

The extension has no server, database, polling, scheduled synchronization, or analytics. One user action makes a bounded Garmin lookup and sends a PADI create mutation only after review and confirmation.

## Important limitations

- This is an unofficial integration. PADI does not currently publish a dive-import API, so a PADI web change can require an adapter update.
- Version 0.5 imports recreational dives. Training dives still need the normal instructor verification workflow.
- PADI stores the log summary, not Garmin's full second-by-second dive profile.
- Garmin exports may contain coordinates but not an edited dive-site name. The review screen therefore asks the diver to confirm the location.
- Duplicate reconciliation reads at most the 500 newest PADI logs. Date is intentionally the primary signal; when unrelated Garmin and PADI dives share a day, review which same-day dives were paired before importing.
- The current package targets desktop Chrome and Edge. A native share-target app is the next step for a one-tap phone workflow.

See [the feature documentation](docs/features/garmin-fit-import.md) for the data flow, contracts, and risks.
