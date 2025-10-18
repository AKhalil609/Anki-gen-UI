import { useCallback, useMemo, useState } from "react";
import { defaultOpts } from "./constants/defaults";
import { useElectronBridge } from "./hooks/useElectronBridge";
import { pathLike } from "./utils/path";
import type { ProgressEvent } from "./types";
import ankiLogo from "./assets/anki_logo.png";

import FilePickers from "./components/FilePickers";
import GeneralSettings from "./components/GeneralSettings";
import ImageSettings from "./components/ImageSettings";
import ActionsPanel from "./components/ActionsPanel";
import LogPanel from "./components/LogPanel";
import OutputsPanel from "./components/OutputsPanel";

export default function App() {
  const [csv, setCsv] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [opts, setOpts] = useState<any>(defaultOpts);

  const [running, setRunning] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [log, setLog] = useState<string>("");
  const [progress, setProgress] = useState<{
    done: number; failed: number; queued: number; running: number; retries: number;
  } | null>(null);
  const [outputs, setOutputs] = useState<string[]>([]);

  const onEvent = useCallback((e: ProgressEvent) => {
    if (e.type === "log") {
      setLog((l) => l + `\n${e.level.toUpperCase()}: ${e.message}`);
      if (e.level === "error") setHasError(true);
    }
    if (e.type === "progress") setProgress(e);
    if (e.type === "preflight") setLog((l) => l + `\n• ${e.message}`);
    if (e.type === "pack:start")
      setLog((l) => l + `\nPacking ${e.total} notes into ${e.parts} file(s)…`);
    if (e.type === "pack:part") setLog((l) => l + `\n→ ${e.filename}`);
    if (e.type === "pack:done") {
      setOutputs(e.outputs);
      setLog((l) => l + `\nDone in ${(e.durationMs / 1000).toFixed(1)}s`);
    }
    if (e.type === "done") {
      setRunning(false);
      setCancelRequested(false);
    }
  }, []);

  const { isElectron, chooseFile, chooseOut, run, cancel } = useElectronBridge(onEvent);

  // Enable Build with CSV selected (Output can be requested on click)
  const canRun = useMemo(() => !!csv && isElectron && !running, [csv, isElectron, running]);

  const disabledReason =
    !isElectron ? "Desktop-only"
    : running ? "Running…"
    : !csv ? "Pick a CSV first"
    : null;

  const handleRun = async () => {
    if (!csv) return;
    if (!isElectron || !run) {
      alert("This action only works in the desktop app. Please run via Electron.");
      return;
    }

    // Prompt for output path if missing
    let outPath = out;
    if (!outPath) {
      try {
        const chosen = await chooseOut();
        if (!chosen) return; // user canceled the save dialog
        outPath = chosen;
        setOut(chosen);
      } catch {
        return;
      }
    }

    setRunning(true);
    setCancelRequested(false);
    setHasError(false);
    setLog("");
    setOutputs([]);
    setProgress(null);

    run({
      input: csv,
      apkgOut: outPath,
      deckName: opts.deckName,
      mediaDir: pathLike(outPath, "media"),
      imagesDir: pathLike(outPath, "media/images"),
      voice: opts.voice,
      imagesPerNote: Number(opts.imagesPerNote) || 1,
      concurrency: Number(opts.concurrency) || 2,
      colFront: opts.colFront,
      colBack: opts.colBack,
      ttsFrom: opts.ttsFrom ?? "back",
      imagesFrom: opts.imagesFrom ?? "back",

      sqlMemoryMB: Number(opts.sqlMemoryMB) || 512,
      useDownsample: !!opts.useDownsample,
      imgMaxWidth: Number(opts.imgMaxWidth) || 480,
      imgMaxHeight: Number(opts.imgMaxHeight) || 480,
      imgFormat: opts.imgFormat,
      imgQuality: Number(opts.imgQuality) || 80,
      imgStripMeta: !!opts.imgStripMeta,
      imgNoEnlarge: !!opts.imgNoEnlarge,
      batchSize: Number(opts.batchSize) || 1000000,

      imageMode: opts.imageMode,
      genProvider: opts.genProvider,
      genStyle: opts.genStyle,
      useImageCache: !!opts.useImageCache,
    });
  };

  const handleCancel = () => {
    if (!isElectron) return;
    setCancelRequested(true);
    try { cancel?.(); } catch {}
  };

  const handleReset = () => {
    setRunning(false);
    setCancelRequested(false);
    setHasError(false);
    setProgress(null);
    setOutputs([]);
  };

  const openMediaDisabled = !isElectron || !out;
  const handleOpenMedia = useCallback(async () => {
    if (!openMediaDisabled) {
      try {
        const mediaDir = pathLike(out!, "media");
        const res = await (window as any).anki?.openPath?.(mediaDir);
        if (!res?.ok) alert("Could not open media folder. It may not exist yet.");
      } catch { alert("Could not open media folder."); }
    }
  }, [openMediaDisabled, out]);

  return (
    <div className="min-h-screen bg-base-100">
      {/* Top bar */}
      <div className="app-navbar">
        <div className="container-page app-navbar__row">
          <img src={ankiLogo} alt="Anki One Logo" style={{ width: 32, height: 32, objectFit: "contain" }} />
          <div>
            <div className="app-title">Anki One</div>
            <div className="app-subtitle">CSV → TTS + Images → .apkg</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="icon-btn"
              title={openMediaDisabled ? "Pick an output path in the Electron app first" : "Open media folder"}
              aria-disabled={openMediaDisabled}
              onClick={handleOpenMedia}
            >
              <span className="material-symbols-rounded">folder_open</span>
            </button>
            <button
              className="icon-btn"
              title="Docs"
              onClick={() => window.open("https://github.com/AKhalil609/Anki-gen-UI","_blank")}
            >
              <span className="material-symbols-rounded">help</span>
            </button>
          </div>
        </div>
      </div>

      <main className="container-page app-main space-y-6">
        {!isElectron && (
          <div className="section-card" style={{ borderStyle: "dashed" }}>
            <b>Preview mode:</b> You’re in a normal browser.
            Build decks in the Electron app with <code>pnpm --filter anki-one-desktop dev</code>.
          </div>
        )}

        <div className="grid-page">
          <div className="space-y-6">
            <section className="section-card">
              <div className="section-header">
                <div className="badge">1</div>
                <div>
                  <div className="section-title">Pick files</div>
                  <div className="section-desc">Choose your CSV and the output <code>.apkg</code> location.</div>
                </div>
              </div>
              <FilePickers
                isElectron={isElectron}
                csv={csv}
                out={out}
                onPickCsv={async () => { if (isElectron) { const r = await chooseFile(); if (r) setCsv(r); } }}
                onPickOut={async () => { if (isElectron) { const r = await chooseOut(); if (r) setOut(r); } }}
              />
            </section>

            <section className="section-card">
              <div className="section-header">
                <div className="badge">2</div>
                <div>
                  <div className="section-title">Configure</div>
                  <div className="section-desc">Voice, columns, and image settings.</div>
                </div>
              </div>
              <div className="form-grid two-col">
                <div className="space-y-6">
                  <GeneralSettings opts={opts} setOpts={setOpts} />
                </div>
                <div className="space-y-6">
                  <ImageSettings opts={opts} setOpts={setOpts} />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6 sticky-col">
            <section className="section-card">
              <div className="section-header">
                <div className="badge">3</div>
                <div>
                  <div className="section-title">Build & Progress</div>
                  <div className="section-desc">Kick off the run and control it.</div>
                </div>
              </div>
              <ActionsPanel
                isElectron={isElectron}
                canRun={canRun}
                running={running}
                progress={progress as any}
                hasError={hasError}
                cancelRequested={cancelRequested}
                onRun={handleRun}
                onCancel={handleCancel}
                onReset={handleReset}
                disabledReason={disabledReason}
              />
            </section>

            <section className="section-card">
              <LogPanel log={log} />
            </section>

            <section className="section-card">
              <OutputsPanel outputs={outputs} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
