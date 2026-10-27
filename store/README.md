# Chrome Web Store submission kit

Everything that can be prepared without access to the publisher accounts is in this directory.

## Start here

1. Replace `SUPPORT_EMAIL` in `privacy-policy.md` and every file under `site/`.
2. Deploy `site/` to any public HTTPS static host. It must be accessible without signing in.
3. Replace the two `REPLACE_WITH_...` URLs in `listing.md` with the deployed privacy and support URLs.
4. Create dedicated PADI and Garmin reviewer credentials, then enter them only in the Chrome Web Store dashboard. Never commit them to this repository.
5. Follow `submission-checklist.md` from top to bottom.

## What to upload

- Extension package: `../release/garmin-dive-padi-sync-v0.5.7.zip`
- Store icon: `assets/icon128.png`
- Screenshots: `assets/screenshots/`
- Optional promotional artwork: `assets/small-promo-440x280.png` and `assets/marquee-1400x560.png`
- Listing and privacy answers: `listing.md`
- Reviewer notes: `reviewer-instructions.md`

Regenerate and verify the files with:

```sh
pnpm store:assets
pnpm verify
pnpm test:browser
pnpm package
```

## Official Chrome references

- [Register a developer account](https://developer.chrome.com/docs/webstore/register/)
- [Prepare the extension package](https://developer.chrome.com/docs/webstore/prepare/)
- [Publish in the dashboard](https://developer.chrome.com/docs/webstore/publish/)
- [Store listing requirements](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/)
- [Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/)
- [User Data Policy](https://developer.chrome.com/docs/webstore/user_data/)
- [Review process](https://developer.chrome.com/docs/webstore/review-process/)
