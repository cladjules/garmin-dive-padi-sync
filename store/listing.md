# Chrome Web Store listing copy

Copy these fields into the Chrome Web Store Developer Dashboard. Keep the privacy answers aligned with the extension behavior and the public privacy policy.

## Product details

**Name**

Garmin Dive → PADI

**Summary**

Review and import Garmin dives into your PADI logbook without retyping them.

**Category**

Productivity

**Language**

English

**Detailed description**

Move recreational dive logs from Garmin Connect into your PADI web logbook with review and duplicate checks.

HOW IT WORKS

1. Sync your dive watch with Garmin Dive or Garmin Connect on your phone.
2. Connect DiveBridge with a revocable, read-only Garmin Personal API key.
3. Open your PADI web logbook and choose Import Garmin dives.
4. Select dives, review the mapped fields, and confirm the import.

DUPLICATE-AWARE

DiveBridge compares recent Garmin dives with the live PADI logbook using the dive date. When several dives share a date, depth and bottom time pair them one-to-one. The duplicate check runs again immediately before confirmed imports.

REVIEW BEFORE WRITING

Review titles, locations, boat or shore entry, depth, time, temperature, gas, and available tank-pressure information before anything is created in PADI. Import immediately or save logs as drafts.

PRIVACY-FIRST

- FIT files are parsed locally and discarded.
- No DiveBridge server, account, analytics, advertising, or cloud database.
- The revocable Garmin key stays in extension-local browser storage.
- Garmin bearer tokens, the active PADI session token, recent PADI rows, and dive profiles remain in memory only while needed.
- PADI is changed only after explicit confirmation.

REQUIREMENTS

- Desktop Chrome or a compatible Chromium browser.
- A Garmin account with Personal API access and synced dive activities.
- An active PADI Learning web-logbook session.

CURRENT SCOPE

DiveBridge imports recreational logs. PADI training dives and instructor verification remain in the normal PADI workflow. PADI does not publish this web-logbook interface, so a future PADI website change may require an extension update.

DiveBridge is an independent tool and is not affiliated with, sponsored by, or endorsed by Garmin or PADI. Garmin, Garmin Dive, Garmin Connect, and PADI are trademarks of their respective owners.

## Privacy practices

**Single purpose**

Transfer user-selected Garmin dive logs into the user's PADI web logbook after live duplicate checking, review, and explicit confirmation.

**Permission justification: `storage`**

Stores only the user's revocable read-only Garmin Personal API key and preferred Boat/Shore entry type in extension-local browser storage. The key is never read back into the settings UI and can be removed by disconnecting Garmin.

**Host permission: `https://personal.connectapi.garmin.com/*`**

After a user action, exchanges the user's Personal API key for a short-lived bearer token, lists at most 50 recent dive activities, and downloads only selected activity archives. The bearer token and downloaded archives are kept in memory only.

**Host permission: `https://learning.padi.com/*`**

Injects the user-facing Import Garmin dives controls into the PADI Learning logbook and uses the active PADI browser session only after an explicit user action. The extension never asks for or stores a PADI password.

**Host permission: `https://divelog.global-prod.padi.com/*`**

Reads the user's PADI unit preference and up to 500 recent log summaries for duplicate checks, then creates only the recreational logs the user reviewed and confirmed. Requests use the active PADI session and HTTPS.

**Remote code**

No. All executable code is packaged with the extension. Provider responses contain data only and are validated before use.

### User-data selections

Select only these categories. Chrome requires disclosure when the extension handles data locally or sends it directly between the user's browser and Garmin/PADI, even though the developer does not receive it:

- Authentication information: Garmin Personal API key plus short-lived Garmin and PADI session tokens.
- Location: dive-site text and GPS coordinates when present in the Garmin activity.
- Website content: Garmin dive data, recent PADI log summaries used for duplicate checking, and the reviewed dive-log fields sent to PADI.

Do not select Personally identifiable information, Health information, Financial and payment information, Personal communications, Web history, or User activity. The extension does not handle those categories. In particular, it does not read heart rate, biometrics, symptoms, diagnoses, procedures, or medical history. Garmin dive metrics such as depth, duration, temperature, gas, and tank pressure are treated here as dive-log website content, not health information. Chrome's User activity category refers to interactions such as clicks, scrolling, keystrokes, and network monitoring; DiveBridge does not monitor them.

**Data-use declarations**

- Used only to provide the extension's single purpose and user-facing features.
- Not sold or transferred to third parties outside the user-directed Garmin-to-PADI workflow.
- Not used for advertising, marketing, creditworthiness, lending, or unrelated analytics.
- No developer-operated backend receives the data.
- No human reads the data, except if the user deliberately supplies specific information for support or when required for security or law.

**Privacy policy URL**

`https://cladjules.github.io/garmin-dive-padi-sync/privacy.html`

**Support URL**

`https://cladjules.github.io/garmin-dive-padi-sync/support.html`

## Distribution

- Visibility: Public after approval. Use Trusted testers first if you want a private review round.
- Regions: All regions where the extension's required Garmin Personal API and PADI Learning services are available.
- In-app purchases: No.
- Mature content: No.

## Graphic assets

- Store icon: `store/assets/icon128.png`
- Screenshots: upload `store/assets/screenshots/01` through `05` in filename order.
- Small promo tile: `store/assets/small-promo-440x280.png`
- Marquee promo tile: `store/assets/marquee-1400x560.png`

The screenshots use mocked Garmin/PADI responses and contain no real account data.
