import "@material/web/select/filled-select";
import "@material/web/select/select-option";
import "@material/web/textfield/filled-text-field";
import "@material/web/switch/switch";

type Props = {
  opts: any;
  setOpts: (o: any) => void;
};

export default function ImageSettings({ opts, setOpts }: Props) {
  // Helpers to read values from Material Web fields
  const setFromEvent =
    (key: string, numeric = false) =>
    (e: React.FormEvent<HTMLElement>) => {
      const target = e.target as HTMLInputElement;
      const raw = target?.value ?? "";
      setOpts({ ...opts, [key]: numeric ? Number(raw) || 0 : raw });
    };

  // Switch attributes (Material: boolean presence)
  const downsampleAttr = opts.useDownsample
    ? ({ selected: true } as const)
    : ({} as const);
  const cacheAttr = opts.useImageCache
    ? ({ selected: true } as const)
    : ({} as const);

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
        onClick={(e) => {
          (e.currentTarget as HTMLElement).blur?.();
        }}
      >
        <span>Image settings</span>
        <span className="material-symbols-rounded" aria-hidden>
          expand_more
        </span>
      </summary>

      <div
        style={{
          padding: 16,
          borderTop:
            "1px solid color-mix(in oklab, var(--md-sys-color-outline) 18%, transparent)",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr",
          }}
        >
          {/* Mode (Search vs Generate) */}
          <div>
            <md-filled-select
              label="Image source"
              value={opts.imageMode ?? "search"}
              onInput={setFromEvent("imageMode")}
              style={{ width: "100%" }}
            >
              <md-select-option value="search">
                <div slot="headline">Search (Google/Openverse/Wiki)</div>
              </md-select-option>
              <md-select-option value="generate">
                <div slot="headline">Generate (Pollinations)</div>
              </md-select-option>
            </md-filled-select>

            <md-filled-select
              label="Image source (which column)"
              value={opts.imagesFrom ?? "back"}
              onInput={(e: React.FormEvent<HTMLSelectElement>) => {
                const v = (e.target as any).value ?? "back";
                setOpts({ ...opts, imagesFrom: v });
              }}
              style={{ width: "100%", marginTop: 8 }}
            >
              <md-select-option value="front">
                <div slot="headline">Front column</div>
              </md-select-option>
              <md-select-option value="back">
                <div slot="headline">Back column</div>
              </md-select-option>
            </md-filled-select>
          </div>

          {/* When Generate is chosen, show style */}
          {opts.imageMode === "generate" && (
            <div>
              <md-filled-select
                label="Generation style"
                value={opts.genStyle ?? ""}
                onInput={setFromEvent("genStyle")}
                style={{ width: "100%" }}
              >
                <md-select-option value="">
                  <div slot="headline">None</div>
                </md-select-option>
                <md-select-option value="anime">
                  <div slot="headline">Anime</div>
                </md-select-option>
                <md-select-option value="comic">
                  <div slot="headline">Comic</div>
                </md-select-option>
                <md-select-option value="illustration">
                  <div slot="headline">Illustration</div>
                </md-select-option>
                <md-select-option value="photorealistic">
                  <div slot="headline">Photorealistic</div>
                </md-select-option>
                <md-select-option value="watercolor">
                  <div slot="headline">Watercolor</div>
                </md-select-option>
                <md-select-option value="3D render">
                  <div slot="headline">3D Render</div>
                </md-select-option>
              </md-filled-select>
            </div>
          )}

          {/* Format */}
          <div>
            <md-filled-select
              label="Format"
              value={opts.imgFormat}
              onInput={setFromEvent("imgFormat")}
              style={{ width: "100%" }}
            >
              {["jpeg", "png", "webp", "avif"].map((fmt) => (
                <md-select-option key={fmt} value={fmt}>
                  <div slot="headline">{fmt.toUpperCase()}</div>
                </md-select-option>
              ))}
            </md-filled-select>
          </div>

          {/* Quality */}
          <div>
            <md-filled-text-field
              label="Quality"
              type="number"
              inputmode="numeric"
              value={String(opts.imgQuality ?? "")}
              onInput={setFromEvent("imgQuality", true)}
              supportingText="0–100 (recommended 80)"
              style={{ width: "100%" }}
            ></md-filled-text-field>
          </div>

          {/* Max Width */}
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

          {/* Max Height */}
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

          {/* Downsample toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 4,
            }}
          >
            <div style={{ display: "grid" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Downsample images
              </div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                Reduce large originals to fit within Max Width/Height
              </div>
            </div>

            <md-switch
              {...downsampleAttr}
              onClick={() =>
                setOpts({ ...opts, useDownsample: !opts.useDownsample })
              }
            ></md-switch>
          </div>

          {/* --- NEW: Use cached images toggle --- */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 4,
            }}
          >
            <div style={{ display: "grid" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Use cached images
              </div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                Reuse existing images if available; otherwise fetch or generate
                new ones.
              </div>
            </div>

            <md-switch
              {...cacheAttr}
              onClick={() =>
                setOpts({ ...opts, useImageCache: !opts.useImageCache })
              }
            ></md-switch>
          </div>
        </div>
      </div>
    </details>
  );
}
