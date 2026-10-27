# Chrome Web Store reviewer instructions

Paste the relevant content into the dashboard's **Test instructions** tab. Never commit real reviewer credentials or API keys to this repository.

## Suggested dashboard text

DiveBridge has one purpose: import reviewed Garmin dive activities into the logged-in user's PADI recreational web logbook.

### Prerequisites

The complete flow uses two third-party test accounts. Confidential credentials are supplied below only for Chrome Web Store review.

- PADI Learning test email: `ENTER_IN_DASHBOARD_ONLY`
- PADI Learning test password: `ENTER_IN_DASHBOARD_ONLY`
- Revocable read-only Garmin Personal API key: `ENTER_IN_DASHBOARD_ONLY`

The Garmin test account should contain at least two recreational dive activities. The PADI account should not already contain logs on the same dates, or those dives will correctly appear as duplicates.

### Review steps

1. Install the submitted extension.
2. The DiveBridge settings page opens. Confirm that **What this extension stores** explains local storage and that PADI step 2 is locked.
3. In step 1, paste the supplied Garmin Personal API key and select **Connect Garmin**.
4. Confirm that Garmin becomes connected and the PADI step unlocks.
5. Sign in to `https://learning.padi.com/logbook` with the supplied PADI test account.
6. Select **Import Garmin dives** in the bottom-right.
7. Select one or more dives and continue. The extension reads the current PADI log list and skips date matches.
8. Review the mapped fields. Choose Draft if you do not want a published test log.
9. Confirm the import and wait for the results.
10. Select **Done**. PADI reloads and shows the created log.
11. Run the import again. The previously created log is detected from the live PADI logbook and is not offered again.

### Data and network behavior

- Garmin calls go only to `personal.connectapi.garmin.com` over HTTPS.
- PADI calls go only to `learning.padi.com` and `divelog.global-prod.padi.com` over HTTPS.
- There is no DiveBridge server, analytics endpoint, advertising SDK, or remote executable code.
- The Garmin API key is stored in extension-local storage. Garmin bearer tokens, PADI session tokens, FIT archives, duplicate rows, and parsed profiles are kept in memory only.
- PADI writes happen only after the reviewer confirms them.

### Cleanup

- Delete any test logs created in the PADI test account.
- In DiveBridge settings, select **Disconnect** to remove the Garmin key from extension-local storage.
- Revoke the reviewer key in Garmin Connect after review if desired.
