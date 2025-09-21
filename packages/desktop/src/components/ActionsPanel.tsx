// /packages/desktop/src/components/ActionsPanel.tsx
import "@material/web/button/filled-button";
import "@material/web/progress/linear-progress";
import type { ProgressEvent } from "../types";

type ProgressLite = Extract<ProgressEvent, { type: "progress" }>;

type Props = {
  isElectron: boolean;
  canRun: boolean;
  running: boolean;
  progress: ProgressLite | null;
  onRun: () => void;
};

export default function ActionsPanel({
  isElectron,
  canRun,
  running,
  progress,
  onRun,
}: Props) {
  const disabledAttr = !isElectron || !canRun ? ({ disabled: true } as const) : ({} as const);

  const total =
    (progress?.done ?? 0) +
    (progress?.failed ?? 0) +
    (progress?.running ?? 0) +
    (progress?.queued ?? 0);

  const ratio =
    total > 0 ? Math.min(1, Math.max(0, (progress?.done ?? 0) / total)) : 0;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "var(--md-sys-color-surface)",
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
        <md-filled-button
          {...disabledAttr}
          onClick={onRun as any}
          title={!isElectron ? "Desktop-only" : !canRun ? "Pick CSV & Output first" : "Build deck"}
        >
          {running ? "Running…" : "Build Deck"}
        </md-filled-button>

        {progress && (
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            done <b>{progress.done}</b> / failed <b>{progress.failed}</b> / running{" "}
            <b>{progress.running}</b> / queued <b>{progress.queued}</b>
          </div>
        )}
      </div>

      {/* Linear progress shows only while running */}
      {running && (
        <md-linear-progress
          {...(total > 0
            ? ({ value: ratio } as any)
            : ({ indeterminate: true } as any))}
        ></md-linear-progress>
      )}
    </div>
  );
}
