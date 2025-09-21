// /packages/desktop/src/components/LogPanel.tsx
type Props = { log: string };

export default function LogPanel({ log }: Props) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "var(--md-sys-color-surface)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08)",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>Log</div>

      <pre
        style={{
          margin: 0,
          padding: "12px",
          borderRadius: 12,
          background: "var(--md-sys-color-surface-container-highest, #f6f6f6)",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
          fontSize: 13,
          lineHeight: 1.4,
          maxHeight: "14rem",
          overflow: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {log || "— No log yet —"}
      </pre>
    </div>
  );
}
