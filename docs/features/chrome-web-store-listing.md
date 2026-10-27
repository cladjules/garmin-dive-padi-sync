# Chrome Web Store listing kit

## Purpose

The `store/` directory contains the copy, privacy disclosures, reviewer instructions, public support pages, and generated image assets needed to submit DiveBridge to the Chrome Web Store without inventing claims during dashboard entry.

## Contents

- `store/listing.md`: exact product, privacy, permission, data-use, and distribution copy.
- `store/privacy-policy.md`: canonical privacy-policy source.
- `store/reviewer-instructions.md`: confidential-dashboard test procedure with credential placeholders.
- `store/submission-checklist.md`: account, asset, URL, review, and release checklist.
- `store/site/`: deployable static privacy and support site. Replace `SUPPORT_EMAIL` before publishing.
- `store/assets/`: 128px icon, five 1280×800 product screenshots, and optional promotional tiles.
- `scripts/generateStorePromo.mjs`: deterministic promotional-tile and icon generation.
- `__tests__/browser/extensionSmoke.spec.ts`: optionally emits store screenshots from the fully mocked production extension journey.

## Generation

Run `pnpm store:assets`. It builds the extension, executes only the production extension browser journey with mocked Garmin and PADI responses, captures five exact 1280×800 screenshots, copies the packaged 128px icon, and renders 440×280 and 1400×560 promotional images.

Screenshots contain no real account data. Re-run asset generation whenever the settings or import UI materially changes.

## Privacy boundary

The current Chrome dashboard selections are Authentication information, Location, and Website content because Chrome requires disclosure even when data is processed locally. Do not select Health information: the extension does not read biometric or medical data, and its dive metrics are disclosed as dive-log website content. Do not select User activity: DiveBridge does not monitor clicks, scrolling, keystrokes, browsing, or network activity. The dashboard currently has no User-generated content option. Keep these answers synchronized with both extension behavior and the choices shown by Chrome.

The public privacy URL must be accessible without authentication. The GitHub repository is private, so a repository file alone is not a valid public privacy URL. Deploy `store/site/` to a public HTTPS host and replace all placeholders before submission.

Never place live reviewer credentials or Garmin API keys in the repository. Put them only in the Chrome Web Store dashboard's confidential test-instruction fields.

## External review risks

- PADI's GraphQL endpoint is unofficial and can change.
- Reviewers need dedicated Garmin and PADI test access to exercise the complete flow.
- The locally stored Garmin Personal API key is sensitive even though it is read-only and revocable; disclosures must not imply it is harmless.
- Garmin and PADI names are descriptive third-party trademarks. Keep the independent-product disclaimer visible and avoid implying endorsement.
