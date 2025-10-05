import "@material/web/icon/icon";
import "@material/web/iconbutton/icon-button";
import AnkiIcon from "./icons/AnkiIcon";

type Props = { outputs: string[] };

export default function OutputsPanel({ outputs }: Props) {
  if (!outputs.length) return null;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy output:", err);
    }
  };

  const handleOpen = async (path: string) => {
    try {
      const res = await (window as any).anki.openPath(path);
      if (!res.ok) console.error("Failed to open path:", res.error);
    } catch (err) {
      console.error("Exception while opening path:", err);
    }
  };

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "var(--md-sys-color-surface)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Outputs</div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 8,
        }}
      >
        {outputs.map((o) => (
          <li
            key={o}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              fontSize: 14,
            }}
          >
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={o}
            >
              {o}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <md-icon-button
                aria-label="Copy output path"
                onClick={() => handleCopy(o)}
              >
                <md-icon>
                  <span className="material-symbols-outlined">content_copy</span>
                </md-icon>
              </md-icon-button>
              <md-icon-button
                aria-label="Open output path"
                onClick={() => handleOpen(o)}
              >
                <md-icon>
                  <AnkiIcon />
                </md-icon>
              </md-icon-button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
