type Props = { outputs: string[] };

export default function OutputsPanel({ outputs }: Props) {
  if (!outputs.length) return null;
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <div className="font-semibold mb-2">Outputs</div>
        <ul className="list-disc pl-6 space-y-1">
          {outputs.map((o) => (
            <li key={o} className="truncate">{o}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
