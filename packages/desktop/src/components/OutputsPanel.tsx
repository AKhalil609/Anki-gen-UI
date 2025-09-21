// /packages/desktop/src/components/OutputsPanel.tsx
import "@material/web/icon/icon";
import "@material/web/iconbutton/icon-button";

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
            <md-icon-button
              aria-label="Copy output path"
              onClick={() => handleCopy(o)}
            >
              <md-icon>content_copy</md-icon>
            </md-icon-button>
          </li>
        ))}
      </ul>
    </div>
  );
}
