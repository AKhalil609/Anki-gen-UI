import type { ProgressEvent } from "../types";

type ProgressLite = Extract<ProgressEvent, { type: "progress" }>;

type Props = {
  isElectron: boolean;
  canRun: boolean;
  running: boolean;
  progress: ProgressLite | null;
  onRun: () => void;
};

export default function ActionsPanel({ isElectron, canRun, running, progress, onRun }: Props) {
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <button
            className={`btn btn-primary ${!isElectron || !canRun ? "btn-disabled" : ""}`}
            onClick={onRun}
            disabled={!isElectron || !canRun}
          >
            {running ? "Running…" : "Build Deck"}
          </button>

          {progress && (
            <div className="text-sm opacity-70">
              done <b>{progress.done}</b> / failed <b>{progress.failed}</b> / running{" "}
              <b>{progress.running}</b> / queued <b>{progress.queued}</b>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
