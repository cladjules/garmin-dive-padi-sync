# Chrome Web Store submission checklist

## One-time account setup

- [ ] Register a Chrome Web Store developer account and pay Google's one-time registration fee.
- [ ] Enable two-step verification on the publishing Google account.
- [ ] Choose an actively monitored publisher email.
- [ ] Accept the current developer agreement and policies.

## Public URLs

- [ ] Replace every `REPLACE_WITH_...` and `SUPPORT_EMAIL` placeholder under `store/`.
- [ ] Deploy `store/site/` to a public HTTPS URL.
- [ ] Confirm the privacy URL opens without login and goes directly to the privacy policy.
- [ ] Confirm the support URL opens without login.
- [ ] Put the final privacy and support URLs in `store/listing.md` and the dashboard.
- [ ] Keep the dashboard disclosures, store description, extension UI, and privacy policy consistent.

## Reviewer access

- [ ] Create dedicated Garmin and PADI reviewer accounts that contain no personal data.
- [ ] Add at least two Garmin test dives on dates absent from the PADI test logbook.
- [ ] Create a revocable read-only Garmin Personal API key for review.
- [ ] Put credentials only in the dashboard's confidential Test instructions fields.
- [ ] Never commit credentials or keys to Git.

## Package and assets

- [ ] Run `pnpm verify`.
- [ ] Run `pnpm test:browser`.
- [ ] Run `pnpm store:assets`.
- [ ] Run `pnpm package`.
- [ ] Upload `release/garmin-dive-padi-sync-v0.5.7.zip`.
- [ ] Upload `store/assets/icon128.png`.
- [ ] Upload the five screenshots in filename order.
- [ ] Upload the 440×280 small promo tile.
- [ ] Optionally upload the 1400×560 marquee tile.
- [ ] Confirm `manifest.json` is at the ZIP root and its version is higher than every prior upload.

## Dashboard fields

- [ ] Copy product details from `store/listing.md`.
- [ ] Select Productivity and English.
- [ ] Enter the single-purpose statement.
- [ ] Paste all permission and host-permission justifications.
- [ ] Declare only the user-data categories listed in `store/listing.md`.
- [ ] Certify no sale, advertising, lending, or unrelated use of user data.
- [ ] Declare no in-app purchases.
- [ ] Choose countries/regions and visibility.
- [ ] Paste `store/reviewer-instructions.md` and add confidential credentials.

## Submit safely

- [ ] Select **Submit for review**.
- [ ] Disable automatic publishing if you want to inspect the approved listing before release.
- [ ] Monitor the publisher email and dashboard for reviewer questions.
- [ ] After approval, publish within Google's staged-release window.
- [ ] After launch, revoke the reviewer Garmin key or rotate it before the next review.
