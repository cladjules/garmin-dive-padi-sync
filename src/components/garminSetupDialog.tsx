import { useState, type FormEvent } from "react";

const GARMIN_KEY_URL = "https://connect.garmin.com/app/settings/personalApiToken";

type GarminSetupDialogProps = {
  readonly configured: boolean;
  readonly error?: string;
  readonly isSaving: boolean;
  readonly onClose: () => void;
  readonly onDisconnect: () => void;
  readonly onSave: (apiKey: string) => void;
};

export function GarminSetupDialog({
  configured,
  error,
  isSaving,
  onClose,
  onDisconnect,
  onSave,
}: GarminSetupDialogProps) {
  const [apiKey, setApiKey] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = apiKey.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  };

  return (
    <div className="db-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="db-garmin-setup-title"
        aria-modal="true"
        className="db-dialog db-setup-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="db-dialog-header">
          <div>
            <span className="db-eyebrow">One-time setup</span>
            <h2 id="db-garmin-setup-title">
              {configured ? "Garmin connection" : "Connect your Garmin dives"}
            </h2>
          </div>
          <button
            aria-label="Close setup"
            className="db-icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <a className="db-garmin-key-link" href={GARMIN_KEY_URL} rel="noreferrer" target="_blank">
          <span aria-hidden="true">G</span>
          <strong>Open Garmin to create your API key</strong>
          <small aria-hidden="true">Open ↗</small>
        </a>

        <ol className="db-setup-steps">
          <li>On the Garmin page that opens, create a Personal API key.</li>
          <li>Create a key and copy it. Garmin shows it only once.</li>
          <li>Paste it below. The extension will immediately find your new dives.</li>
        </ol>

        <form onSubmit={handleSubmit}>
          <label className="db-field">
            <span>{configured ? "Replacement Personal API key" : "Personal API key"}</span>
            <input
              autoComplete="off"
              autoFocus
              onChange={(event) => setApiKey(event.currentTarget.value)}
              placeholder="Paste your Garmin key"
              spellCheck={false}
              type="password"
              value={apiKey}
            />
          </label>

          {error ? (
            <div className="db-notice db-notice-error" role="alert">
              {error}
            </div>
          ) : null}

          <p className="db-privacy-note">
            Stored only in this browser extension. It gives read-only access to your Garmin data;
            remove or revoke it at any time.
          </p>

          <footer className="db-actions">
            {configured ? (
              <button
                className="db-button db-button-danger"
                disabled={isSaving}
                onClick={onDisconnect}
                type="button"
              >
                Disconnect
              </button>
            ) : null}
            <span className="db-action-spacer" />
            <button className="db-button db-button-quiet" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="db-button db-button-primary"
              disabled={!apiKey.trim() || isSaving}
              type="submit"
            >
              {isSaving ? "Connecting…" : "Save and find dives"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
