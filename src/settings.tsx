import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";

import {
  GarminRuntimeResponseSchema,
  type GarminRuntimeRequest,
  type GarminRuntimeResponse,
} from "./types/garmin";
import "./settings.css";

const GARMIN_KEY_URL = "https://connect.garmin.com/app/settings/personalApiToken";
const PADI_LOGBOOK_URL = "https://learning.padi.com/logbook";

type ConnectionState =
  | { readonly name: "loading" }
  | { readonly name: "disconnected" }
  | { readonly message?: string; readonly name: "connected" }
  | { readonly message: string; readonly name: "error" };

type SettingsAppProps = {
  readonly welcome?: boolean;
};

async function sendGarminRequest(request: GarminRuntimeRequest): Promise<GarminRuntimeResponse> {
  let raw: unknown;
  try {
    raw = await chrome.runtime.sendMessage(request);
  } catch {
    return {
      code: "unexpected",
      message:
        "The extension background service could not be reached. Reload the extension and retry.",
      status: "error",
    };
  }

  const response = GarminRuntimeResponseSchema.safeParse(raw);
  return response.success
    ? response.data
    : {
        code: "unexpected",
        message: "The extension returned an unexpected response. Reload it and retry.",
        status: "error",
      };
}

function connectionMessage(response: GarminRuntimeResponse): string | undefined {
  if (response.status === "dives") {
    return `${response.activities.length} recent Garmin ${response.activities.length === 1 ? "dive was" : "dives were"} found. Open PADI to identify which are new.`;
  }
  if (response.status === "no-dives") {
    return "Connected. Garmin did not return any recent dive activities yet.";
  }
  return undefined;
}

function ConnectionPanel({
  connection,
  onConnected,
}: {
  readonly connection: ConnectionState;
  readonly onConnected: (next: ConnectionState) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [replaceKey, setReplaceKey] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const configured = connection.name === "connected" || (connection.name === "error" && replaceKey);
  const showKeyForm =
    connection.name === "disconnected" || connection.name === "error" || replaceKey;

  const saveKey = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed || busy) {
      return;
    }

    setBusy(true);
    const response = await sendGarminRequest({ apiKey: trimmed, type: "garmin:save-key-and-list" });
    setBusy(false);
    if (response.status === "error") {
      onConnected({ message: response.message, name: "error" });
      return;
    }

    setApiKey("");
    setReplaceKey(false);
    onConnected({ message: connectionMessage(response), name: "connected" });
  };

  const checkConnection = async (): Promise<void> => {
    setBusy(true);
    const response = await sendGarminRequest({ type: "garmin:list-dives" });
    setBusy(false);
    if (response.status === "setup-required") {
      onConnected({ name: "disconnected" });
    } else if (response.status === "error") {
      onConnected({ message: response.message, name: "error" });
    } else {
      onConnected({ message: connectionMessage(response), name: "connected" });
    }
  };

  const disconnect = async (): Promise<void> => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }
    setBusy(true);
    const response = await sendGarminRequest({ type: "garmin:disconnect" });
    setBusy(false);
    if (response.status === "disconnected") {
      setConfirmDisconnect(false);
      setReplaceKey(false);
      onConnected({ name: "disconnected" });
    }
  };

  return (
    <section aria-labelledby="connection-title" className="settings-card connection-card">
      <div className="card-heading">
        <div className="setup-step-heading">
          <span aria-hidden="true" className="setup-step-number">
            1
          </span>
          <div>
            <span className="eyebrow">Step 1 · Garmin connection</span>
            <h2 id="connection-title">
              {connection.name === "loading"
                ? "Checking this browser…"
                : connection.name === "connected" && !replaceKey
                  ? "Garmin is connected"
                  : "Connect your Garmin account"}
            </h2>
          </div>
        </div>
        <span
          className={`connection-badge connection-${connection.name === "connected" ? "on" : "off"}`}
        >
          <i /> {connection.name === "connected" ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="connection-body">
        {connection.name === "loading" ? <div className="settings-skeleton" /> : null}

        {connection.name === "connected" && !replaceKey ? (
          <>
            <p className="card-copy">
              Your read-only Personal API key is stored in this Chrome profile. The key itself is
              never displayed again here.
            </p>
            <div aria-label="Garmin connection details" className="connection-facts">
              <article>
                <span aria-hidden="true">R</span>
                <div>
                  <strong>Read-only</strong>
                  <p>Dive access cannot change your Garmin account.</p>
                </div>
              </article>
              <article>
                <span aria-hidden="true">↻</span>
                <div>
                  <strong>On demand</strong>
                  <p>No background syncing or polling.</p>
                </div>
              </article>
              <article>
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>Review first</strong>
                  <p>PADI changes only after you confirm.</p>
                </div>
              </article>
            </div>
            {connection.message ? (
              <div className="settings-notice settings-notice-success" role="status">
                {connection.message}
              </div>
            ) : null}
            <div className="button-row connection-actions">
              <button
                className="button button-primary"
                disabled={busy}
                onClick={() => void checkConnection()}
                type="button"
              >
                {busy ? "Checking…" : "Check for Garmin dives"}
              </button>
              <button
                className="button button-secondary"
                onClick={() => setReplaceKey(true)}
                type="button"
              >
                Replace key
              </button>
              <button
                className="button button-danger"
                disabled={busy}
                onClick={() => void disconnect()}
                type="button"
              >
                {confirmDisconnect ? "Confirm disconnect" : "Disconnect"}
              </button>
            </div>
            {confirmDisconnect ? (
              <p className="inline-warning">
                This removes the Garmin key. Your PADI logbook is unchanged.
              </p>
            ) : null}
          </>
        ) : null}

        {showKeyForm && connection.name !== "loading" ? (
          <form onSubmit={(event) => void saveKey(event)}>
            <p className="card-copy">
              Create a revocable key on Garmin’s official Personal API page, then paste it here
              once.
            </p>
            <a className="garmin-key-cta" href={GARMIN_KEY_URL} rel="noreferrer" target="_blank">
              <span aria-hidden="true" className="garmin-key-cta-icon">
                G
              </span>
              <span className="garmin-key-cta-copy">
                <small>Required setup · Official Garmin Connect</small>
                <strong>Open Garmin to create your API key</strong>
              </span>
              <span aria-hidden="true" className="garmin-key-cta-action">
                Open ↗
              </span>
            </a>
            <ul className="setup-steps">
              <li>
                <span aria-hidden="true">⌚</span>
                <div>
                  <strong>Sync the watch</strong>
                  <p>
                    Open Garmin Dive or Garmin Connect on your phone and let Bluetooth sync finish.
                  </p>
                </div>
              </li>
              <li>
                <span aria-hidden="true">K</span>
                <div>
                  <strong>Create a Garmin key</strong>
                  <p>Garmin shows the Personal API key only once, so copy it before leaving.</p>
                </div>
              </li>
              <li>
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>Connect this extension</strong>
                  <p>Paste the key below. We validate it before your first import.</p>
                </div>
              </li>
            </ul>
            <label className="key-field">
              <span>Personal API key</span>
              <input
                autoComplete="off"
                onChange={(event) => setApiKey(event.currentTarget.value)}
                placeholder="Paste your Garmin key"
                spellCheck={false}
                type="password"
                value={apiKey}
              />
            </label>
            {connection.name === "error" ? (
              <div className="settings-notice settings-notice-error" role="alert">
                {connection.message}
              </div>
            ) : null}
            <div className="button-row">
              <button
                className="button button-primary"
                disabled={!apiKey.trim() || busy}
                type="submit"
              >
                {busy ? "Connecting…" : "Connect Garmin"}
              </button>
              {configured || replaceKey ? (
                <button
                  className="button button-quiet"
                  onClick={() => setReplaceKey(false)}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
            <p className="field-note">
              Stored only in extension-local browser storage. Never sent to our server.
            </p>
          </form>
        ) : null}
      </div>
    </section>
  );
}

function StoredDataPanel() {
  return (
    <section aria-labelledby="privacy-title" className="settings-card privacy-card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">Privacy at a glance</span>
          <h2 id="privacy-title">What this extension stores</h2>
        </div>
        <span className="privacy-badge">Local-first</span>
      </div>
      <p className="card-copy">
        Two convenience settings stay in Chrome. Your dive data and PADI access do not.
      </p>
      <div className="privacy-groups">
        <article className="privacy-group">
          <header>
            <span className="storage-icon">K</span>
            <div>
              <strong>Stored in this browser</strong>
              <p>Small settings you control and can remove.</p>
            </div>
            <b>2 items</b>
          </header>
          <ul>
            <li>
              <strong>Garmin API key</strong>
              <span>Read-only and revocable</span>
            </li>
            <li>
              <strong>Boat or shore choice</strong>
              <span>Reused for your next review</span>
            </li>
          </ul>
        </article>
        <article className="privacy-group privacy-group-private">
          <header>
            <span className="storage-icon">✓</span>
            <div>
              <strong>Never stored by DiveBridge</strong>
              <p>Used in memory only when an import needs it.</p>
            </div>
            <b>Private</b>
          </header>
          <div>
            <p>
              <strong>PADI duplicate checks</strong> are read live from your PADI logbook, while FIT
              files are parsed locally and discarded.
            </p>
            <p>
              <strong>PADI credentials and tokens</strong> are never collected or saved.
            </p>
          </div>
        </article>
      </div>
      <div className="privacy-callout">
        <strong>No DiveBridge server</strong>
        <p>There is no analytics account, database, or cloud copy of your dives.</p>
      </div>
    </section>
  );
}

function PadiImportPanel({ available }: { readonly available: boolean }) {
  return (
    <section
      aria-labelledby="padi-import-title"
      className={`settings-card next-step-card${available ? "" : " next-step-card-locked"}`}
    >
      <div className="card-heading">
        <div className="setup-step-heading">
          <span aria-hidden="true" className="setup-step-number">
            2
          </span>
          <div>
            <span className="eyebrow">Step 2 · PADI import</span>
            <h2 id="padi-import-title">Import from the PADI page</h2>
          </div>
        </div>
        <span aria-live="polite" className="padi-badge">
          {available ? "Ready to import" : "Connect Garmin first"}
        </span>
      </div>
      <p className="card-copy">
        {available
          ? "Garmin is connected. Open PADI Learning and DiveBridge will guide the import inside your logbook."
          : "Complete step 1 to unlock PADI importing. The extension needs Garmin access before it can find your dives."}
      </p>
      <ul className="padi-steps">
        <li>
          <span aria-hidden="true">↗</span>
          <div>
            <strong>Open your PADI logbook</strong>
            <p>You stay signed in directly with PADI.</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true">+</span>
          <div>
            <strong>Choose Import Garmin dives</strong>
            <p>The button appears in the bottom-right of the PADI page.</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Review and confirm</strong>
            <p>Duplicates are checked live before anything is added.</p>
          </div>
        </li>
      </ul>
      <div className="padi-session-note">
        <strong>No PADI login is shared</strong>
        <p>The extension uses only the PADI session already open in this browser.</p>
      </div>
      {available ? (
        <a
          className="button button-primary"
          href={PADI_LOGBOOK_URL}
          rel="noreferrer"
          target="_blank"
        >
          Open PADI Logbook <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <button className="button button-locked" disabled type="button">
          Connect Garmin first
        </button>
      )}
    </section>
  );
}

export function SettingsApp({ welcome }: SettingsAppProps) {
  const [connection, setConnection] = useState<ConnectionState>({ name: "loading" });
  const isWelcome = welcome ?? new URLSearchParams(window.location.search).get("welcome") === "1";

  useEffect(() => {
    let active = true;
    void sendGarminRequest({ type: "garmin:get-connection" }).then((response) => {
      if (!active) {
        return;
      }
      if (response.status === "error") {
        setConnection({ message: response.message, name: "error" });
      } else {
        setConnection(
          response.status === "connection" && response.configured
            ? { name: "connected" }
            : { name: "disconnected" },
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="settings-page">
      <header className="settings-nav">
        <a className="settings-brand" href="#top" aria-label="DiveBridge settings home">
          <img alt="" className="brand-mark" src="icons/icon48.png" />
          <span>
            <strong>DiveBridge</strong>
            <small>Garmin → PADI</small>
          </span>
        </a>
        {connection.name === "connected" ? (
          <a
            className="button button-light"
            href={PADI_LOGBOOK_URL}
            rel="noreferrer"
            target="_blank"
          >
            Open PADI Logbook <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <button className="button button-light" disabled type="button">
            Connect Garmin first
          </button>
        )}
      </header>

      <main id="top">
        <section className="settings-hero">
          <div>
            <span className="eyebrow">
              {isWelcome ? "Welcome to DiveBridge" : "Extension settings"}
            </span>
            <h1>
              {isWelcome ? "Let’s connect your first dive." : "Your dive sync, under control."}
            </h1>
            <p>
              Your watch talks to the Garmin phone app. Garmin uploads the dive to your account.
              DiveBridge finds it there, lets you review it, then adds it to PADI only after you
              confirm.
            </p>
          </div>
          <div className="flow-card" aria-label="How dives move between services">
            <div>
              <span>⌚</span>
              <strong>Garmin watch</strong>
              <small>Records the dive</small>
            </div>
            <i>→</i>
            <div>
              <span>◉</span>
              <strong>Phone app</strong>
              <small>Syncs to Garmin</small>
            </div>
            <i>→</i>
            <div>
              <span>◇</span>
              <strong>DiveBridge</strong>
              <small>Checks and reviews</small>
            </div>
            <i>→</i>
            <div>
              <span>✓</span>
              <strong>PADI</strong>
              <small>Saves the log</small>
            </div>
          </div>
        </section>

        <StoredDataPanel />

        <div className="setup-section-heading">
          <span className="eyebrow">Simple setup</span>
          <h2>Get started in 2 steps</h2>
          <p>Connect Garmin once, then run every import from your PADI logbook.</p>
        </div>

        <div className="setup-grid">
          <ConnectionPanel connection={connection} onConnected={setConnection} />
          <PadiImportPanel available={connection.name === "connected"} />
        </div>

        <section className="faq-section">
          <span className="eyebrow">Quick answers</span>
          <div className="faq-grid">
            <article>
              <h3>Does this connect directly to my phone?</h3>
              <p>
                No. Your phone syncs the watch to Garmin’s cloud; the extension reads your account
                from there.
              </p>
            </article>
            <article>
              <h3>Do I need the preview webpage?</h3>
              <p>No. The Chrome or Edge extension is all you need for real imports.</p>
            </article>
            <article>
              <h3>Can a dive be imported twice?</h3>
              <p>
                Each import is matched against your live PADI logbook before a new log is created.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="settings-footer">
        DiveBridge v0.5.7 · Local-first Garmin Dive → PADI import
      </footer>
    </div>
  );
}

const root = document.querySelector<HTMLDivElement>("#root");
if (root) {
  createRoot(root).render(<SettingsApp />);
}
