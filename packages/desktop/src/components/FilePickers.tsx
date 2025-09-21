import "@material/web/button/filled-button";
import "@material/web/textfield/filled-text-field";

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
  // Only add disabled attribute when really disabled (custom elements need this)
  const disabledAttr = isElectron ? {} : ({ disabled: true } as const);

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "16px",
        background: "var(--md-sys-color-surface)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* CSV Picker */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <md-filled-button
          {...disabledAttr}
          title={!isElectron ? "Desktop-only" : ""}
          // React can listen to 'click' on custom elements
          onClick={onPickCsv as any}
        >
          Choose CSV
        </md-filled-button>

        <md-filled-text-field
          label="CSV File"
          value={csv || "No file chosen"}
          readonly
          style={{ flex: 1 }}
        ></md-filled-text-field>
      </div>

      {/* Output Picker */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <md-filled-button
          {...disabledAttr}
          title={!isElectron ? "Desktop-only" : ""}
          onClick={onPickOut as any}
        >
          Choose Output (.apkg)
        </md-filled-button>

        <md-filled-text-field
          label="Output File"
          value={out || "No output chosen"}
          readonly
          style={{ flex: 1 }}
        ></md-filled-text-field>
      </div>
    </div>
  );
}