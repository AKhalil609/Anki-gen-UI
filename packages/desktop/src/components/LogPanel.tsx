type Props = { log: string };

export default function LogPanel({ log }: Props) {
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <div className="label"><span className="label-text">Log</span></div>
        <textarea className="textarea textarea-bordered h-56 w-full" value={log} readOnly />
      </div>
    </div>
  );
}
