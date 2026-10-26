type StatusDialogProps = {
  readonly actionLabel?: string;
  readonly kind: "error" | "loading" | "success";
  readonly message: string;
  readonly onAction?: () => void;
  readonly onClose: () => void;
  readonly padiLogId?: number;
  readonly title: string;
};

export function StatusDialog({
  actionLabel,
  kind,
  message,
  onAction,
  onClose,
  padiLogId,
  title,
}: StatusDialogProps) {
  return (
    <div
      className="db-overlay"
      role="presentation"
      onMouseDown={kind === "loading" ? undefined : onClose}
    >
      <section
        aria-labelledby="db-status-title"
        aria-modal="true"
        className="db-dialog db-status-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div aria-hidden="true" className={`db-status-mark db-status-mark-${kind}`}>
          {kind === "loading" ? <span className="db-spinner" /> : kind === "success" ? "✓" : "!"}
        </div>
        <span className="db-eyebrow">Garmin → PADI</span>
        <h2 id="db-status-title">{title}</h2>
        <p>{message}</p>
        {kind !== "loading" ? (
          <div className="db-actions db-actions-centered">
            {padiLogId ? (
              <a
                className="db-button db-button-primary"
                href={`/logbook/log-dive/recreational/update/${padiLogId}`}
              >
                View in PADI
              </a>
            ) : onAction && actionLabel ? (
              <>
                <button className="db-button db-button-quiet" onClick={onClose} type="button">
                  Close
                </button>
                <button className="db-button db-button-primary" onClick={onAction} type="button">
                  {actionLabel}
                </button>
              </>
            ) : (
              <button className="db-button db-button-primary" onClick={onClose} type="button">
                Close
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
