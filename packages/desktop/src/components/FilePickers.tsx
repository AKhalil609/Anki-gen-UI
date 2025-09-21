type Props = {
  isElectron: boolean;
  csv: string | null;
  out: string | null;
  onPickCsv: () => Promise<void>;
  onPickOut: () => Promise<void>;
};

export default function FilePickers({
  isElectron,
  csv,
  out,
  onPickCsv,
  onPickOut,
}: Props) {
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <button
            onClick={onPickCsv}
            className="btn btn-primary"
            disabled={!isElectron}
            title={!isElectron ? "Desktop-only" : ""}
          >
            Choose CSV
          </button>
          <div className="flex-1">
            <div className="input input-bordered w-full truncate">
              {csv || "No file chosen"}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <button
            onClick={onPickOut}
            className="btn"
            disabled={!isElectron}
            title={!isElectron ? "Desktop-only" : ""}
          >
            Choose Output (.apkg)
          </button>
          <div className="flex-1">
            <div className="input input-bordered w-full truncate">
              {out || "No output chosen"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
