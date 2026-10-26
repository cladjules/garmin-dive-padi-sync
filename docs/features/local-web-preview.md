# Local web preview

## Purpose

The Vite webpage provides a polished, interactive preview of the Garmin-to-PADI batch workflow at `http://localhost:5173`. It is for product review and UI development; it uses fixed sample dives and never contacts Garmin or PADI.

Live imports remain in the browser extension. A standalone localhost origin cannot read the authenticated PADI session on `learning.padi.com`, and the preview must never ask the user to paste PADI credentials or tokens.

## User flow

1. Run `pnpm dev` and open the printed local URL.
2. Choose **Try the import flow** or **Review dives**.
3. Select sample dives and continue through duplicate checking.
4. Review titles, locations, and entry types.
5. Preview the sequential import and results states. No external account is changed.

For live extension development, run `pnpm dev:extension`, load `dist/` as an unpacked Chrome or Edge extension, and use PADI Learning.

## Key files

- `index.html`: Vite document entry.
- `vite.config.ts`: fixed local development and preview ports plus the isolated `web-dist/` output.
- `src/web.tsx`: React browser entry point.
- `src/webApp.tsx`: sample data and preview state machine.
- `src/web.css`: responsive dashboard and landing-page styling.
- `src/components/batchSyncDialog.tsx`: shared production and preview workflow dialogs.
- `__tests__/components/webApp.test.tsx`: full preview journey regression test.

## Runtime and performance

- The page is entirely client-side and has no backend, database, polling, or network requests.
- Sample cardinality is fixed at four dives. Progress timers are visual only.
- `pnpm build:web` produces a static bundle in `web-dist/` without modifying the extension's `dist/` bundle.

## Security boundary

- Never add Garmin keys, PADI tokens, passwords, or real dive payloads to the preview.
- Do not proxy private provider APIs through the local page merely to bypass browser-origin restrictions.
- Keep the demo label and no-account messaging visible so sample actions cannot be mistaken for live imports.
