import VoiceSelect from "./VoiceSelect";

type Props = {
  opts: any;
  setOpts: (o: any) => void;
};

export default function GeneralSettings({ opts, setOpts }: Props) {
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="form-control md:col-span-2">
          <div className="label"><span className="label-text">Deck Name</span></div>
          <input
            className="input input-bordered"
            value={opts.deckName}
            onChange={(e) => setOpts({ ...opts, deckName: e.target.value })}
          />
        </label>

        <label className="form-control">
          <div className="label"><span className="label-text">Voice</span></div>
          <VoiceSelect
            value={opts.voice}
            onChange={(voice) => setOpts({ ...opts, voice })}
          />
        </label>

        <label className="form-control">
          <div className="label"><span className="label-text">Images / Note</span></div>
          <input
            className="input input-bordered"
            type="number"
            value={opts.imagesPerNote}
            onChange={(e) => setOpts({ ...opts, imagesPerNote: e.target.value })}
          />
        </label>

        <label className="form-control">
          <div className="label"><span className="label-text">Concurrency</span></div>
          <input
            className="input input-bordered"
            type="number"
            value={opts.concurrency}
            onChange={(e) => setOpts({ ...opts, concurrency: e.target.value })}
          />
        </label>

        <div className="md:col-span-2">
          <div className="label"><span className="label-text">CSV Columns</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="input input-bordered"
              value={opts.colFront}
              onChange={(e) => setOpts({ ...opts, colFront: e.target.value })}
              placeholder="Front column"
            />
            <input
              className="input input-bordered"
              value={opts.colBack}
              onChange={(e) => setOpts({ ...opts, colBack: e.target.value })}
              placeholder="Back column"
            />
          </div>
        </div>

        <label className="form-control">
          <div className="label"><span className="label-text">sql.js Memory (MB)</span></div>
          <input
            className="input input-bordered"
            type="number"
            value={opts.sqlMemoryMB}
            onChange={(e) => setOpts({ ...opts, sqlMemoryMB: e.target.value })}
          />
        </label>

        <label className="form-control">
          <div className="label"><span className="label-text">Batch Size</span></div>
          <input
            className="input input-bordered"
            type="number"
            value={opts.batchSize}
            onChange={(e) => setOpts({ ...opts, batchSize: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
