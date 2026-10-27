# DiveBridge Privacy Policy

Effective date: October 27, 2026

DiveBridge is a browser extension that helps a diver review and transfer selected Garmin dive activities into the diver's PADI web logbook. This policy describes the information the extension handles, why it is needed, where it goes, and how it is retained.

## Information handled

DiveBridge handles the minimum data needed for its user-facing import workflow:

- a user-created, revocable Garmin Personal API key;
- short-lived Garmin bearer tokens;
- Garmin dive summaries, selected FIT activity archives, dive metrics, and optional dive-site coordinates;
- the active PADI browser-session token already maintained by PADI Learning;
- recent PADI log summaries needed for duplicate detection;
- reviewed dive fields sent to PADI after confirmation, including title, date, location, depth, time, conditions, gas, tank pressure, entry type, status, and notes; and
- the user's preferred Boat/Shore entry type.

Dive data can include dates and times, depths, duration, temperatures, gas mixture, tank pressure, dive-site text, and optional coordinates. Authentication data includes the Garmin Personal API key and short-lived Garmin and PADI session tokens described below. DiveBridge does not read heart rate, biometrics, symptoms, diagnoses, procedures, or medical history.

## How information is used

Information is used only to provide DiveBridge's single purpose: find Garmin dives, compare them with the live PADI logbook, let the user review them, and create only the recreational PADI logs the user explicitly confirms.

DiveBridge does not use information for advertising, marketing profiles, creditworthiness, lending, analytics, or any unrelated purpose. DiveBridge does not sell user information.

## Storage and retention

The Garmin Personal API key and Boat/Shore preference are stored in extension-local browser storage. The extension never reads the stored key back into its settings UI. The user can remove it by selecting **Disconnect**, removing the extension, clearing extension storage, or revoking the key in Garmin Connect.

Garmin bearer tokens remain only in background-worker memory. PADI session tokens, recent PADI duplicate rows, Garmin activity archives, parsed FIT profiles, and in-progress fingerprints remain only in memory while needed and are discarded when the workflow or browser context ends. DiveBridge does not maintain duplicate history.

## Transmission and sharing

At the user's direction, DiveBridge communicates directly over HTTPS with:

- Garmin Personal API endpoints at `personal.connectapi.garmin.com` to exchange the API key, list recent dives, and download selected activities; and
- PADI Learning and its logbook endpoint at `learning.padi.com` and `divelog.global-prod.padi.com` to read unit settings and recent logs and to create only confirmed logs.

There is no DiveBridge application server, database, analytics service, advertising network, or cloud copy of the user's dives. The developer therefore does not receive or retain the user's keys, tokens, dive profiles, or PADI logs.

Information is not transferred to other parties except when the user directs the Garmin-to-PADI workflow, when needed for security, when required by law, or as part of a business transfer subject to this policy and applicable law.

## Public policy and support pages

The public DiveBridge policy and support pages are static and receive no extension data. Their hosting provider may process ordinary request metadata, such as an IP address, under the provider's own privacy policy. This is separate from the extension's Garmin-to-PADI workflow.

## Human access

The developer does not have access to information processed locally by the extension. A human will not read user information unless the user deliberately supplies specific information for support and consents to that access, or access is necessary for security or legal compliance.

## Security

Provider communications use HTTPS. The extension requests access only to the Garmin Personal API, PADI Learning, and the PADI logbook endpoint required for its stated functionality. It contains no remote executable code and does not request broad browsing access.

The Garmin key is read-only and revocable, but it should still be treated as a secret because it may expose information available through the user's Garmin Personal API. Users should revoke a key they believe has been exposed.

## User choices and deletion

Users control each lookup and import. PADI is changed only after an explicit confirmation. Users can exclude individual dives, save drafts, disconnect Garmin, revoke the Garmin key, clear extension storage, or uninstall DiveBridge. PADI logs already created are controlled and deleted through PADI.

## Third-party services

Garmin and PADI process information under their own terms and privacy policies. DiveBridge is an independent tool and is not affiliated with, sponsored by, or endorsed by Garmin or PADI.

## Children

DiveBridge is not directed to children and does not knowingly collect children's information for the developer.

## Changes

This policy may be updated when DiveBridge's behavior or legal obligations change. The effective date above will be updated, and material changes to data practices will be disclosed in the extension and its store listing before they take effect.

## Contact

For questions or privacy requests, use the verified developer contact shown on DiveBridge's Chrome Web Store listing.
