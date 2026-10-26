# Extension welcome and settings

## Purpose

DiveBridge opens a dedicated welcome/settings page after first installation. It explains the watch → phone app → Garmin cloud → extension → PADI flow, makes the privacy model visible, and provides Garmin connection controls without requiring the user to discover the injected PADI button first.

Clicking the extension toolbar action opens the same settings page later. Chrome and Edge also expose it through the extension details page.

## User flow

1. Chrome opens `settings.html?welcome=1` after the extension is first installed.
2. The page explains that Garmin Dive or Garmin Connect syncs the watch to Garmin's cloud; there is no direct phone-to-computer connection.
3. A prominent, full-width **Required setup** action opens Garmin's official Personal API page in a new tab. The user creates a revocable key there and pastes it into the adjacent DiveBridge field.
4. The background worker validates the key with one bounded recent-dive lookup before reporting the connection state.
5. The user opens PADI Learning and starts live imports with **Import Garmin dives**.

The settings page can check for recent Garmin dives, replace or disconnect the key, and explain that duplicate matching reads the live PADI logbook without retaining history.

The information hierarchy is deliberate: **What this extension stores** is a full-width privacy summary immediately below the hero, followed by a clearly numbered two-step setup. **1. Connect your Garmin account** and **2. Import from the PADI page** use equal desktop columns and equal height. On narrow screens, the setup cards stack in numbered order and return to their natural height.

Step 2 remains visibly muted and its PADI action is disabled until the background worker confirms a Garmin connection. Its status reads **Connect Garmin first**; the header shortcut follows the same gate. Successful validation unlocks both controls and replaces them with PADI Logbook links.

When unlocked, step 2 uses the same aqua/teal visual language as the rest of DiveBridge. Red is reserved for errors, warnings, and destructive actions rather than ordinary PADI navigation.

The Garmin Personal API destination must remain a high-contrast action beside the setup instructions and key field. It must not be reduced to a small inline text link: creating the key is the only off-extension step and needs to be immediately discoverable.

## Key files

- `extension/settings.html`: extension-owned document shell.
- `extension/icons/`: generated DiveBridge watch-to-PADI toolbar and store icon exports at 16, 32, 48, and 128 pixels. The prior arrow/ripple master remains as a recoverable design fallback but is not packaged.
- `src/settings.tsx`: onboarding content, settings state, and Garmin controls.
- `src/settings.css`: responsive visual design.
- `src/background.ts`: first-install page opening and toolbar action handling.
- `extension/manifest.json`: `action` and `options_ui` declarations.
- `__tests__/components/settings.test.tsx`: onboarding and privacy-control regression coverage.
- `__tests__/browser/extensionSmoke.spec.ts`: production-bundle welcome and connection journey.

## Storage and privacy

- The page never reads back or displays a saved Garmin key. It asks only whether a key is configured.
- Saving or checking a connection contacts Garmin only after an explicit button press. There is no polling.
- Disconnect removes the Garmin key and in-memory bearer token. It does not change PADI.
- Duplicate comparison data is fetched from PADI only during an import and discarded afterward. No duplicate-history control is needed.
- The preferred Boat/Shore entry type remains in extension-local storage for convenience.
- PADI credentials, PADI tokens, raw FIT archives, and complete dive profiles are not stored by the settings page.

## Performance and failure behavior

- Initial page load asks the background worker whether a Garmin key exists; it makes no network request.
- A save or **Check for Garmin dives** action uses the same bounded 50-summary Garmin request as the importer.
- Provider and runtime failures are sanitized before display. The pasted key remains in component memory only until the save attempt finishes.
