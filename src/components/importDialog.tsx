import type { ChangeEvent, FormEvent } from "react";

import type { EditablePadiDive, ImportedDive, PadiDiveType, PadiStatus } from "../types/dive";

type ImportDialogProps = {
  readonly dive: EditablePadiDive;
  readonly error?: string;
  readonly imported: ImportedDive;
  readonly isDuplicate: boolean;
  readonly isSaving: boolean;
  readonly onChange: (dive: EditablePadiDive) => void;
  readonly onClose: () => void;
  readonly onSave: (status: PadiStatus) => void;
};

type NumberFieldProps = {
  readonly label: string;
  readonly min?: number;
  readonly onChange: (value: number | undefined) => void;
  readonly required?: boolean;
  readonly step?: number;
  readonly suffix: string;
  readonly value?: number;
};

function NumberField({
  label,
  min = 0,
  onChange,
  required = false,
  step = 0.1,
  suffix,
  value,
}: NumberFieldProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const next = event.currentTarget.valueAsNumber;
    onChange(Number.isFinite(next) ? next : undefined);
  };

  return (
    <label className="db-field">
      <span>{label}</span>
      <span className="db-input-with-suffix">
        <input
          min={min}
          onChange={handleChange}
          required={required}
          step={step}
          type="number"
          value={value ?? ""}
        />
        <span>{suffix}</span>
      </span>
    </label>
  );
}

export function ImportDialog({
  dive,
  error,
  imported,
  isDuplicate,
  isSaving,
  onChange,
  onClose,
  onSave,
}: ImportDialogProps) {
  const depthUnit = dive.unitSystem === "Imperial" ? "ft" : "m";
  const pressureUnit = dive.unitSystem === "Imperial" ? "psi" : "bar";
  const temperatureUnit = dive.unitSystem === "Imperial" ? "°F" : "°C";

  const update = <Key extends keyof EditablePadiDive>(
    key: Key,
    value: EditablePadiDive[Key],
  ): void => {
    onChange({ ...dive, [key]: value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSave("Publish");
  };

  const canSave =
    dive.title.trim().length > 0 &&
    dive.location.trim().length > 0 &&
    Boolean(dive.diveType) &&
    dive.maxDepth > 0 &&
    dive.bottomTimeMinutes > 0;

  return (
    <div className="db-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="db-dialog-title"
        aria-modal="true"
        className="db-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="db-dialog-header">
          <div>
            <span className="db-eyebrow">Garmin → PADI</span>
            <h2 id="db-dialog-title">Review your dive</h2>
            <p>{imported.sourceFileName} · parsed locally</p>
          </div>
          <button
            aria-label="Close import"
            className="db-icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="db-highlight-grid">
            <div>
              <span>Max depth</span>
              <strong>
                {dive.maxDepth} {depthUnit}
              </strong>
            </div>
            <div>
              <span>Bottom time</span>
              <strong>{dive.bottomTimeMinutes} min</strong>
            </div>
            <div>
              <span>Gas</span>
              <strong>{dive.gas?.label ?? "Not recorded"}</strong>
            </div>
          </div>

          {isDuplicate ? (
            <div className="db-notice db-notice-warning" role="alert">
              This exact FIT file was imported before. Saving again will create a duplicate.
            </div>
          ) : null}

          {error ? (
            <div className="db-notice db-notice-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="db-form-grid">
            <label className="db-field db-field-wide">
              <span>Dive title</span>
              <input
                autoFocus
                onChange={(event) => update("title", event.currentTarget.value)}
                required
                type="text"
                value={dive.title}
              />
            </label>

            <label className="db-field db-field-wide">
              <span>Dive site or location</span>
              <input
                onChange={(event) => update("location", event.currentTarget.value)}
                placeholder="e.g. Blue Reef, Sample Bay"
                required
                type="text"
                value={dive.location}
              />
            </label>

            <label className="db-field">
              <span>Date</span>
              <input
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => update("date", event.currentTarget.value)}
                required
                type="date"
                value={dive.date}
              />
            </label>

            <label className="db-field">
              <span>Entry</span>
              <select
                onChange={(event) => update("diveType", event.currentTarget.value as PadiDiveType)}
                required
                value={dive.diveType ?? ""}
              >
                <option disabled value="">
                  Select once
                </option>
                <option value="Boat">Boat</option>
                <option value="BeachShore">Shore</option>
              </select>
            </label>

            <NumberField
              label="Max depth"
              min={0.1}
              onChange={(value) => update("maxDepth", value ?? 0)}
              required
              suffix={depthUnit}
              value={dive.maxDepth}
            />
            <NumberField
              label="Bottom time"
              min={1}
              onChange={(value) => update("bottomTimeMinutes", value ?? 0)}
              required
              step={1}
              suffix="min"
              value={dive.bottomTimeMinutes}
            />

            <NumberField
              label="Surface temperature"
              onChange={(value) => update("surfaceTemperature", value)}
              suffix={temperatureUnit}
              value={dive.surfaceTemperature}
            />
            <NumberField
              label="Bottom temperature"
              onChange={(value) => update("bottomTemperature", value)}
              suffix={temperatureUnit}
              value={dive.bottomTemperature}
            />

            <NumberField
              label="Starting pressure"
              onChange={(value) => update("startPressure", value)}
              suffix={pressureUnit}
              value={dive.startPressure}
            />
            <NumberField
              label="Ending pressure"
              onChange={(value) => update("endPressure", value)}
              suffix={pressureUnit}
              value={dive.endPressure}
            />

            <label className="db-field db-field-wide">
              <span>Notes</span>
              <textarea
                onChange={(event) => update("notes", event.currentTarget.value)}
                rows={3}
                value={dive.notes}
              />
            </label>
          </div>

          <p className="db-privacy-note">
            The FIT file stays in this browser. Your existing PADI session is used only for this
            import.
          </p>

          <footer className="db-actions">
            <button className="db-button db-button-quiet" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="db-button db-button-secondary"
              disabled={!canSave || isSaving}
              onClick={() => onSave("Draft")}
              type="button"
            >
              Save as draft
            </button>
            <button
              className="db-button db-button-primary"
              disabled={!canSave || isSaving}
              type="submit"
            >
              {isSaving ? "Importing…" : isDuplicate ? "Import again" : "Import to PADI"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
