type Props = {
  opts: any;
  setOpts: (o: any) => void;
};

export default function ImageSettings({ opts, setOpts }: Props) {
  return (
    <div className="collapse collapse-arrow bg-base-200 shadow-sm">
      <input type="checkbox" />
      <div className="collapse-title text-md font-medium">Image settings</div>
      <div className="collapse-content">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="form-control">
            <div className="label"><span className="label-text">Format</span></div>
            <select
              className="select select-bordered"
              value={opts.imgFormat}
              onChange={(e) => setOpts({ ...opts, imgFormat: e.target.value })}
            >
              <option>jpeg</option>
              <option>png</option>
              <option>webp</option>
              <option>avif</option>
            </select>
          </label>

          <label className="form-control">
            <div className="label"><span className="label-text">Quality</span></div>
            <input
              className="input input-bordered"
              type="number"
              value={opts.imgQuality}
              onChange={(e) => setOpts({ ...opts, imgQuality: e.target.value })}
            />
          </label>

          <label className="form-control">
            <div className="label"><span className="label-text">Max Width</span></div>
            <input
              className="input input-bordered"
              type="number"
              value={opts.imgMaxWidth}
              onChange={(e) => setOpts({ ...opts, imgMaxWidth: e.target.value })}
            />
          </label>

          <label className="form-control">
            <div className="label"><span className="label-text">Max Height</span></div>
            <input
              className="input input-bordered"
              type="number"
              value={opts.imgMaxHeight}
              onChange={(e) => setOpts({ ...opts, imgMaxHeight: e.target.value })}
            />
          </label>

          <label className="label cursor-pointer md:col-span-2">
            <span className="label-text">Downsample images</span>
            <input
              type="checkbox"
              className="toggle"
              checked={opts.useDownsample}
              onChange={(e) => setOpts({ ...opts, useDownsample: e.target.checked })}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
