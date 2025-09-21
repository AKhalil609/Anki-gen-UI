import { useCallback, useMemo, useState } from "react";
import { defaultOpts } from "./constants/defaults";
import { useElectronBridge } from "./hooks/useElectronBridge";
import { pathLike } from "./utils/path";
import type { ProgressEvent } from "./types";

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
  const [log, setLog] = useState<string>("");
  const [progress, setProgress] = useState<{
    done: number;
    failed: number;
    queued: number;
    running: number;
    retries: number;
  } | null>(null);
  const [outputs, setOutputs] = useState<string[]>([]);

  const onEvent = useCallback((e: ProgressEvent) => {
    if (e.type === "log") setLog((l) => l + `\n${e.level.toUpperCase()}: ${e.message}`);
    if (e.type === "progress") setProgress(e);
    if (e.type === "preflight") setLog((l) => l + `\n• ${e.message}`);
    if (e.type === "pack:start")
      setLog((l) => l + `\nPacking ${e.total} notes into ${e.parts} file(s)…`);
    if (e.type === "pack:part") setLog((l) => l + `\n→ ${e.filename}`);
    if (e.type === "pack:done") {
      setOutputs(e.outputs);
      setLog((l) => l + `\nDone in ${(e.durationMs / 1000).toFixed(1)}s`);
      setRunning(false);
    }
  }, []);

  const { isElectron, chooseFile, chooseOut, run } = useElectronBridge(onEvent);

  const canRun = useMemo(() => !!csv && !!out && !running, [csv, out, running]);

  const handleRun = () => {
    if (!csv || !out) return;
    if (!isElectron || !run) {
      alert("This action only works in the desktop app. Please run via Electron.");
      return;
    }
    setRunning(true);
    setLog("");
    setOutputs([]);
    run({
      input: csv,
      apkgOut: out,
      deckName: opts.deckName,
      mediaDir: pathLike(out, "media"),
      imagesDir: pathLike(out, "media/images"),
      voice: opts.voice,
      imagesPerNote: Number(opts.imagesPerNote) || 1,
      concurrency: Number(opts.concurrency) || 2,
      colFront: opts.colFront,
      colBack: opts.colBack,
      sqlMemoryMB: Number(opts.sqlMemoryMB) || 512,
      useDownsample: !!opts.useDownsample,
      imgMaxWidth: Number(opts.imgMaxWidth) || 480,
      imgMaxHeight: Number(opts.imgMaxHeight) || 480,
      imgFormat: opts.imgFormat,
      imgQuality: Number(opts.imgQuality) || 80,
      imgStripMeta: !!opts.imgStripMeta,
      imgNoEnlarge: !!opts.imgNoEnlarge,
      batchSize: Number(opts.batchSize) || 1000000,
    });
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* Top bar */}
      <div className="navbar bg-base-200 border-b">
        <div className="container-page w-full">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold">Anki One</div>
            <div className="opacity-60">CSV → TTS + Images → .apkg</div>
          </div>
          <div className="ml-auto" />
        </div>
      </div>

      <main className="container-page py-6 space-y-6">
        {!isElectron && (
          <div className="alert alert-warning shadow">
            <span>
              <b>Preview mode:</b> You’re viewing the UI in a normal browser. Building decks
              requires the desktop app (Electron). Run{" "}
              <code>pnpm --filter anki-one-desktop dev</code> and use the Electron window.
            </span>
          </div>
        )}

        {/* File pickers */}
        <FilePickers
          isElectron={isElectron}
          csv={csv}
          out={out}
          onPickCsv={async () => {
            if (isElectron) {
              const result = await chooseFile();
              if (result) setCsv(result);
            }
          }}
          onPickOut={async () => {
            if (isElectron) {
              const result = await chooseOut();
              if (result) setOut(result);
            }
          }}
        />

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <GeneralSettings opts={opts} setOpts={setOpts} />
            <ImageSettings opts={opts} setOpts={setOpts} />
          </div>

          {/* Actions & log */}
          <div className="space-y-6">
            <ActionsPanel
              isElectron={isElectron}
              canRun={canRun}
              running={running}
              progress={progress as any}
              onRun={handleRun}
            />
            <LogPanel log={log} />
            <OutputsPanel outputs={outputs} />
          </div>
        </div>
      </main>
    </div>
  );
}
