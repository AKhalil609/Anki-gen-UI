// /packages/desktop/src/components/ImageSettings.tsx
import "@material/web/select/filled-select";
import "@material/web/select/select-option";
import "@material/web/textfield/filled-text-field";
import "@material/web/switch/switch";

type Props = {
  opts: any;
  setOpts: (o: any) => void;
};

const STYLES = [
  "anime",
  "comic",
  "watercolor",
  "photorealistic",
  "flat illustration",
  "3D render",
];

export default function ImageSettings({ opts, setOpts }: Props) {
  // IMPORTANT: For Material Web custom elements, prefer currentTarget.value
  const setFromEvent = (key: string, numeric = false) =>
    (e: React.FormEvent<HTMLElement>) => {
      const el = e.currentTarget as unknown as { value?: string };
      const raw = el?.value ?? "";
      setOpts({ ...opts, [key]: numeric ? Number(raw) || 0 : raw });
    };

  const downsampleAttr = opts.useDownsample ? ({ selected: true } as const) : ({} as const);
  const isGenerate = opts.imageMode === "generate";

  return (
    <details
      open
      style={{
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--md-sys-color-surface)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08)",
      }}
    >
      <summary
        style={{
          padding: "14px 16px",
          cursor: "pointer",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          listStyle: "none",
          userSelect: "none",
        }}
        onClick={(e) => (e.currentTarget as HTMLElement).blur?.()}
      >
        <span>Image settings</span>
        <span className="material-symbols-rounded" aria-hidden>expand_more</span>
      </summary>

      <div style={{ padding: 16, borderTop: "1px solid color-mix(in oklab, var(--md-sys-color-outline) 18%, transparent)" }}>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr" }}>
          {/* Source mode */}
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Image Source</div>
            <md-filled-select
              label="Image Source"
              value={opts.imageMode ?? "search"}
              onInput={setFromEvent("imageMode")}
              onChange={setFromEvent("imageMode")}
              style={{ width: "100%" }}
            >
              <md-select-option value="search">
                <div slot="headline">Search (Openverse/Google)</div>
              </md-select-option>
              <md-select-option value="generate">
                <div slot="headline">Generate (Pollinations)</div>
              </md-select-option>
            </md-filled-select>
          </div>

          {/* Provider (fixed for now to Pollinations) */}
          {isGenerate && (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Generator</div>
              <md-filled-select
                label="Provider"
                value={opts.genProvider ?? "pollinations"}
                onInput={setFromEvent("genProvider")}
                onChange={setFromEvent("genProvider")}
                style={{ width: "100%" }}
              >
                <md-select-option value="pollinations">
                  <div slot="headline">Pollinations</div>
                </md-select-option>
              </md-filled-select>
            </div>
          )}

          {/* Style */}
          {isGenerate && (
            <div>
              <md-filled-select
                label="Style"
                value={opts.genStyle ?? "anime"}
                onInput={setFromEvent("genStyle")}
                onChange={setFromEvent("genStyle")}
                style={{ width: "100%" }}
              >
                {STYLES.map((s) => (
                  <md-select-option key={s} value={s}>
                    <div slot="headline">{s}</div>
                  </md-select-option>
                ))}
              </md-filled-select>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                Uses the English sentence as the prompt and emphasizes the word in (parentheses).
              </div>
            </div>
          )}

          {/* Format / Quality / Size */}
          <div>
            <md-filled-select
              label="Format"
              value={opts.imgFormat}
              onInput={setFromEvent("imgFormat")}
              onChange={setFromEvent("imgFormat")}
              style={{ width: "100%" }}
            >
              {["jpeg", "png", "webp", "avif"].map((fmt) => (
                <md-select-option key={fmt} value={fmt}>
                  <div slot="headline">{fmt.toUpperCase()}</div>
                </md-select-option>
              ))}
            </md-filled-select>
          </div>

          <div>
            <md-filled-text-field
              label="Quality"
              type="number"
              inputmode="numeric"
              value={String(opts.imgQuality ?? "")}
              onInput={setFromEvent("imgQuality", true)}
              style={{ width: "100%" }}
            ></md-filled-text-field>
          </div>

          <div>
            <md-filled-text-field
              label="Max Width"
              type="number"
              inputmode="numeric"
              value={String(opts.imgMaxWidth ?? "")}
              onInput={setFromEvent("imgMaxWidth", true)}
              style={{ width: "100%" }}
            ></md-filled-text-field>
          </div>

          <div>
            <md-filled-text-field
              label="Max Height"
              type="number"
              inputmode="numeric"
              value={String(opts.imgMaxHeight ?? "")}
              onInput={setFromEvent("imgMaxHeight", true)}
              style={{ width: "100%" }}
            ></md-filled-text-field>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 4,
            }}
          >
            <div style={{ display: "grid" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Downsample images</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                Reduce large originals to fit within Max Width/Height
              </div>
            </div>

            <md-switch
              {...downsampleAttr}
              onClick={() => setOpts({ ...opts, useDownsample: !opts.useDownsample })}
            ></md-switch>
          </div>
        </div>
      </div>
    </details>
  );
}
