import "@material/web/textfield/filled-text-field";
import VoiceSelect from "./VoiceSelect";

type Props = {
  opts: any;
  setOpts: (o: any) => void;
};

export default function GeneralSettings({ opts, setOpts }: Props) {
  // Web Component input handler helper
  const setFromEvent = (key: string, numeric = false) =>
    (e: React.FormEvent<HTMLInputElement>) => {
      const raw = e.currentTarget.value ?? "";
      setOpts({ ...opts, [key]: numeric ? Number(raw) || 0 : raw });
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
        }}
      >
        {/* Deck Name */}
        <div style={{ gridColumn: "1 / -1" }}>
          <md-filled-text-field
            label="Deck Name"
            value={opts.deckName}
            onInput={setFromEvent("deckName")}
            style={{ width: "100%" }}
          ></md-filled-text-field>
        </div>

        {/* Voice */}
        <div>
          <div style={{ marginBottom: 6, fontSize: 12, opacity: 0.8 }}>Voice</div>
          <VoiceSelect
            value={opts.voice}
            onChange={(voice) => setOpts({ ...opts, voice })}
          />
        </div>

        {/* Images / Note */}
        <div>
          <md-filled-text-field
            label="Images / Note"
            type="number"
            value={String(opts.imagesPerNote ?? "")}
            onInput={setFromEvent("imagesPerNote", true)}
            inputmode="numeric"
            style={{ width: "100%" }}
          ></md-filled-text-field>
        </div>

        {/* Concurrency */}
        <div>
          <md-filled-text-field
            label="Concurrency"
            type="number"
            value={String(opts.concurrency ?? "")}
            onInput={setFromEvent("concurrency", true)}
            inputmode="numeric"
            style={{ width: "100%" }}
          ></md-filled-text-field>
        </div>

        {/* CSV Columns */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.8 }}>CSV Columns</div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr", }}
          >
            <md-filled-text-field
              label="Front column"
              value={opts.colFront}
              onInput={setFromEvent("colFront")}
              style={{ width: "100%" }}
            ></md-filled-text-field>

            <md-filled-text-field
              label="Back column"
              value={opts.colBack}
              onInput={setFromEvent("colBack")}
              style={{ width: "100%" }}
            ></md-filled-text-field>
          </div>
        </div>

        {/* sql.js Memory (MB) */}
        <div>
          <md-filled-text-field
            label="sql.js Memory (MB)"
            type="number"
            value={String(opts.sqlMemoryMB ?? "")}
            onInput={setFromEvent("sqlMemoryMB", true)}
            inputmode="numeric"
            style={{ width: "100%" }}
          ></md-filled-text-field>
        </div>

        {/* Batch Size */}
        <div>
          <md-filled-text-field
            label="Batch Size"
            type="number"
            value={String(opts.batchSize ?? "")}
            onInput={setFromEvent("batchSize", true)}
            inputmode="numeric"
            style={{ width: "100%" }}
          ></md-filled-text-field>
        </div>
      </div>
    </div>
  );
}
