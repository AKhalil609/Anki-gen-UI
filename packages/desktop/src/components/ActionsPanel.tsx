// /packages/desktop/src/components/ActionsPanel.tsx
import "@material/web/button/filled-button";
import "@material/web/progress/linear-progress";
import type { ProgressEvent } from "../types";

type ProgressLite = Extract<ProgressEvent, { type: "progress" }>;

type Props = {
  isElectron: boolean;
  /** Parent decides when Build is enabled (e.g., !!csv && isElectron && !running) */
  canRun: boolean;
  running: boolean;
  progress: ProgressLite | null;
  hasError?: boolean;
  cancelRequested?: boolean;
  onRun: () => void;
  onCancel: () => void;
  onReset: () => void;
  /** Optional message shown when Build is disabled */
  disabledReason?: string | null;
};

export default function ActionsPanel({
  isElectron,
  canRun,
  running,
  progress,
  hasError = false,
  cancelRequested = false,
  onRun,
  onCancel,
  onReset,
  disabledReason = null,
}: Props) {
  const total =
    (progress?.done ?? 0) +
    (progress?.failed ?? 0) +
    (progress?.running ?? 0) +
    (progress?.queued ?? 0);

  const ratio =
    total > 0 ? Math.min(1, Math.max(0, (progress?.done ?? 0) / total)) : 0;

  // Important for Material Web custom elements: use attribute presence for disabled
  const buildDisabledAttr = canRun ? ({} as const) : ({ disabled: true } as const);
  const stopDisabledAttr = cancelRequested ? ({ disabled: true } as const) : ({} as const);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "var(--surface-container)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08)",
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Build */}
        <md-filled-button
          {...buildDisabledAttr}
          onClick={onRun as any}
          title={
            disabledReason ??
            (running ? "Running…" : isElectron ? "Build deck" : "Desktop-only")
          }
        >
          {running ? "Running…" : "Build Deck"}
        </md-filled-button>

        {/* Stop (visible only while running) */}
        {running && (
          <md-filled-button
            {...stopDisabledAttr}
            onClick={onCancel as any}
            title="Cancel the current run"
          >
            {cancelRequested ? "Cancelling…" : "Stop"}
          </md-filled-button>
        )}

        {/* Reset (visible if error OR we have progress and not running) */}
        {(hasError || (!running && progress)) && (
          <md-filled-button onClick={onReset as any} title="Clear progress and log">
            Reset
          </md-filled-button>
        )}

        {/* Counters */}
        {progress && (
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            done <b>{progress.done}</b> / failed <b>{progress.failed}</b> / running{" "}
            <b>{progress.running}</b> / queued <b>{progress.queued}</b>
          </div>
        )}
      </div>

      {/* Explain why Build is disabled (only when not running) */}
      {!running && !canRun && disabledReason && (
        <div className="alert" style={{ fontSize: 12, opacity: 0.85 }}>
          {disabledReason}
        </div>
      )}

      {/* Progress bar while running */}
      {running && (
        <md-linear-progress
          {...(total > 0
            ? ({ value: ratio } as any)
            : ({ indeterminate: true } as any))}
        ></md-linear-progress>
      )}

      {/* Error helper */}
      {hasError && (
        <div className="alert" style={{ fontSize: 13, opacity: 0.9 }}>
          An error occurred. You can <b>Stop</b> to abort or <b>Reset</b> to clear the UI.<br/>
          Make sure that the input files are valid and the column names are correct.
        </div>
      )}
    </div>
  );
}
