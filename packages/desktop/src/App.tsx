import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultOpts } from "./constants/defaults";
import { useElectronBridge } from "./hooks/useElectronBridge";
import { pathLike } from "./utils/path";
import type { ProgressEvent } from "./types";
import "./styles.css";
import ankiLogo from "./assets/anki_logo.png";
import { VOICES } from "./data/voices";
import VoiceDropdown from "./components/VoiceDropdown";
import Dropdown from "./components/Dropdown"; // styled dropdowns (no search)

type StepKey = "files" | "csv" | "voice_img" | "progress";

/** Order matters for animation direction */
const STEP_ORDER: StepKey[] = ["files", "csv", "voice_img", "progress"];

/** Common delimiter options (UI label -> actual value).
 * "auto" means let backend auto-detect. Others are literal characters.
 */
const DELIMITER_OPTIONS = [
  { value: "auto", label: "Auto-detect" },
  { value: ",", label: "Comma (,)" },
  { value: ";", label: "Semicolon (;)" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe (|)" },
  { value: ":", label: "Colon (:)" },
] as const;

/** Small, accessible info tooltip shown on hover/focus. */
function InfoTip({ text, ariaLabel }: { text: string; ariaLabel?: string }) {
  return (
    <span className="relative group inline-flex items-center align-middle">
      <span
        tabIndex={0}
        className="material-symbols-outlined ml-1 inline-flex size-5 items-center justify-center rounded-full text-[var(--muted)] hover:text-white cursor-help select-none outline-none"
        aria-label={ariaLabel || "Info"}
        title={text}
      >
        info
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-[-6px] z-20 hidden w-max -translate-x-1/2 -translate-y-full rounded-md px-3 py-1.5 text-xs font-medium leading-tight text-white shadow-lg group-hover:block group-focus-within:block"
        style={{ background: "rgba(17, 24, 39, 0.95)" }}
      >
        {text}
        <span
          className="absolute left-1/2 top-full block h-2 w-2 -translate-x-1/2"
          style={{
            background: "rgba(17, 24, 39, 0.95)",
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          }}
        />
      </span>
    </span>
  );
}

type CsvPreview = {
  ok: boolean;
  header: string[];
  rows: string[][];
  delimiter: string; // delimiter that backend actually used/detected
  error?: string;
};

/* ----------------- Theme helpers ----------------- */
type Theme = "dark" | "light";
function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export default function App() {
  const [step, _setStep] = useState<StepKey>("files");
  const [direction, setDirection] = useState<1 | -1>(1); // 1: forward, -1: back

  // Theme state (persisted)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = (localStorage.getItem("theme") as Theme | null) || null;
    return saved ?? getSystemTheme();
  });
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);
  // Keep in sync with OS changes if user hasn’t explicitly set after load
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq?.addEventListener) return;
    const handler = () => {
      const saved = localStorage.getItem("theme");
      if (!saved) {
        const sys = mq.matches ? "dark" : "light";
        setTheme(sys as Theme);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Animated nav indicator measurements
  const navRefs = useRef<Record<StepKey, HTMLButtonElement | null>>({
    files: null,
    csv: null,
    voice_img: null,
    progress: null,
  });
  const [navIndicator, setNavIndicator] = useState<{
    top: number;
    height: number;
  }>({
    top: 0,
    height: 0,
  });

  const setStep = useCallback((next: StepKey) => {
    _setStep(next);
  }, []);

  const [csv, setCsv] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [opts, setOpts] = useState<any>({
    ...defaultOpts,
    // new: csvDelimiter (persist in opts so it flows to run())
    csvDelimiter: (defaultOpts as any)?.csvDelimiter ?? "auto",
  });

  // Block progressing past Step 1 until both CSV and output are chosen
  const canProceed = !!csv && !!out;

  const goTo = useCallback(
    (next: StepKey) => {
      // Only allow navigating away from "files" when both CSV and output are selected.
      if (next !== "files" && !canProceed) {
        alert("Pick a CSV and an output .apkg location first.");
        return;
      }
      const curIdx = STEP_ORDER.indexOf(step);
      const nextIdx = STEP_ORDER.indexOf(next);
      setDirection(nextIdx >= curIdx ? 1 : -1);
      setStep(next);
    },
    [step, setStep, canProceed]
  );

  useEffect(() => {
    function measure() {
      const el = navRefs.current[step];
      if (!el) return;
      const parent = el.parentElement?.parentElement; // nav container
      const parentRect = parent?.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      if (!parentRect) return;
      setNavIndicator({
        top: rect.top - parentRect.top,
        height: rect.height,
      });
    }
    measure();
    const r = new ResizeObserver(measure);
    const root = document.getElementById("root");
    if (root) r.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      r.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [step]);

  const [running, setRunning] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [doneCode, setDoneCode] = useState<number | null>(null);

  const [log, setLog] = useState<string>("");
  const [progress, setProgress] = useState<{
    done: number;
    failed: number;
    queued: number;
    running: number;
    retries: number;
  } | null>(null);
  const [outputs, setOutputs] = useState<string[]>([]);

  const onEvent = useCallback(
    (e: ProgressEvent) => {
      if (e.type === "log") {
        setLog((l) => l + `\n${e.level.toUpperCase()}: ${e.message}`);
        if (e.level === "error") setHasError(true);
      }
      if (e.type === "progress") setProgress(e);
      if (e.type === "preflight") setLog((l) => l + `\n• ${e.message}`);
      if (e.type === "pack:start")
        setLog(
          (l) => l + `\nPacking ${e.total} notes into ${e.parts} file(s)…`
        );
      if (e.type === "pack:part") setLog((l) => l + `\n→ ${e.filename}`);
      if (e.type === "pack:done") {
        setOutputs(e.outputs);
        setLog((l) => l + `\nDone in ${(e.durationMs / 1000).toFixed(1)}s`);
      }
      if (e.type === "done") {
        setRunning(false);
        setCancelRequested(false);
        setDoneCode(e.code);

        // 🔴 If we "succeeded" but nothing was written, treat it as an error.
        setHasError((prev) => {
          if (prev) return prev;
          const noOutputs = !outputs || outputs.length === 0;
          const looksSuccess = e.code === 0;
          return looksSuccess && noOutputs ? true : false;
        });

        setStep("progress");
      }
    },
    [setStep, outputs]
  );

  const { isElectron, chooseFile, chooseOut, run, cancel } =
    useElectronBridge(onEvent);

  const canRun = useMemo(
    () => !!csv && !!out && isElectron && !running,
    [csv, out, isElectron, running]
  );
  const disabledReason = !isElectron
    ? "Desktop-only"
    : running
    ? "Running…"
    : !csv
    ? "Pick a CSV first"
    : !out
    ? "Pick an output file"
    : null;

  // ---------- actions ----------
  const handlePickCsv = async () => {
    if (!isElectron) return;
    const r = await chooseFile();
    if (r) setCsv(r);
  };
  const handlePickOut = async () => {
    if (!isElectron) return;
    const r = await chooseOut();
    if (r) setOut(r);
  };

  const handleRun = async () => {
    if (!csv) return;
    if (!isElectron || !run) {
      alert(
        "This action only works in the desktop app. Please run via Electron."
      );
      return;
    }
    let outPath = out;
    if (!outPath) {
      const chosen = await chooseOut();
      if (!chosen) return;
      outPath = chosen;
      setOut(chosen);
    }

    setRunning(true);
    setCancelRequested(false);
    setHasError(false);
    setDoneCode(null);
    setLog("");
    setOutputs([]);
    setProgress(null);
    setStep("progress");

    // Map "auto" to undefined to let backend auto-detect
    const delimiterToUse =
      opts.csvDelimiter && opts.csvDelimiter !== "auto"
        ? opts.csvDelimiter
        : undefined;

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
      // Default to TRUE when undefined, so the checkbox is effectively “on” by default.
      useImageCache: opts.useImageCache !== false,
      // NEW: pass delimiter to backend (undefined = auto-detect)
      csvDelimiter: delimiterToUse,
    });
  };

  const handleCancel = () => {
    if (!isElectron) return;
    setCancelRequested(true);
    try {
      cancel?.();
    } catch {}
  };
  const handleReset = () => {
    setRunning(false);
    setCancelRequested(false);
    setHasError(false);
    setProgress(null);
    setOutputs([]);
    setLog("");
    setDoneCode(null);
    setStep("files");
  };

  // ---- sidebar bottom actions (new) ----
  const openMediaDisabled = !isElectron || !out;
  const handleOpenMedia = useCallback(async () => {
    if (openMediaDisabled) return;
    try {
      const mediaDir = pathLike(out!, "media");
      const res = await (window as any).anki?.openPath?.(mediaDir);
      if (!res?.ok) alert("Could not open media folder. It may not exist yet.");
    } catch {
      alert("Could not open media folder.");
    }
  }, [openMediaDisabled, out]);

  const handleOpenDocs = () =>
    window.open("https://github.com/AKhalil609/Anki-gen-UI", "_blank");

  const navItems = [
    { id: "files", label: "File Selection", icon: "upload_file" },
    { id: "csv", label: "Map Columns", icon: "splitscreen" },
    { id: "voice_img", label: "Voice & Images", icon: "settings" },
    { id: "progress", label: "Progress & Logs", icon: "sync" },
  ] as const;

  // Render current step (slides in on change)
  function renderStepContent() {
    if (step === "files")
      return (
        <FilesStep
          key="files"
          csv={csv}
          out={out}
          setCsv={setCsv}
          onPickCsv={handlePickCsv}
          onPickOut={handlePickOut}
          onNext={() => goTo("csv")}
        />
      );
    if (step === "csv")
      return (
        <CsvStep
          key="csv"
          csvPath={csv}
          deckName={opts.deckName}
          colFront={opts.colFront}
          colBack={opts.colBack}
          csvDelimiter={opts.csvDelimiter}
          onChange={(patch) => setOpts({ ...opts, ...patch })}
          onBack={() => goTo("files")}
          onNext={() => goTo("voice_img")}
        />
      );
    if (step === "voice_img")
      return (
        <VoiceImageStep
          key="voice_img"
          opts={opts}
          voices={VOICES.map((v) => v.id)}
          onChange={(patch) => setOpts({ ...opts, ...patch })}
          onBack={() => goTo("csv")}
          onNext={() => goTo("progress")}
          onBuild={handleRun}
          canRun={canRun}
          disabledReason={disabledReason}
        />
      );
    return (
      <ProgressStep
        key="progress"
        running={running}
        progress={progress}
        hasError={hasError}
        cancelRequested={cancelRequested}
        doneCode={doneCode}
        outputs={outputs}
        log={log}
        onCancel={handleCancel}
        onReset={handleReset}
        onCopy={(t) => navigator.clipboard.writeText(t).catch(() => {})}
        onReveal={(p) => (window as any).anki?.openPath?.(p)}
      />
    );
  }

  const stepAnimClass = direction === 1 ? "slide-in-right" : "slide-in-left";
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const themeIsDark = theme === "dark";

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-72 px-6 py-7 border-r border-white/5 bg-[var(--bg)] flex flex-col">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img src={ankiLogo} alt="" className="w-9 h-9 rounded-lg" />
            <div className="flex-1">
              <div className="text-base font-semibold leading-tight">
                CSV to Anki
              </div>
              <div className="text-sm text-[var(--muted)]">Converter</div>
            </div>

            {/* Theme toggle (sun/moon inside the switch) */}
            <label
              className="theme-toggle shrink-0"
              title={
                themeIsDark ? "Switch to Light mode" : "Switch to Dark mode"
              }
            >
              <input
                type="checkbox"
                aria-label="Toggle dark mode"
                checked={themeIsDark}
                onChange={toggleTheme}
              />
              <span className="toggle-track">
                <span className="material-symbols-outlined icon sun">
                  light_mode
                </span>
                <span className="material-symbols-outlined icon moon">
                  dark_mode
                </span>
                <span className="thumb" />
              </span>
            </label>
          </div>

          <div className="relative">
            {/* floating, animated indicator */}
            <div
              className="nav-indicator"
              style={{
                transform: `translateY(${navIndicator.top}px)`,
                height: `${navIndicator.height}px`,
              }}
            />
            <nav className="flex flex-col gap-2 relative">
              {navItems.map((s) => {
                const active = step === (s.id as StepKey);
                const disabled = s.id !== "files" && !canProceed;

                return (
                  <button
                    key={s.id}
                    ref={(el) => (navRefs.current[s.id as StepKey] = el)}
                    onClick={() => {
                      if (disabled) return;
                      goTo(s.id as StepKey);
                    }}
                    disabled={disabled}
                    title={
                      disabled
                        ? "Pick a CSV and output location first"
                        : s.label
                    }
                    className={`nav-btn ${
                      active ? "nav-btn--active" : "nav-btn--idle"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span className="material-symbols-outlined">{s.icon}</span>
                    <span className="text-sm font-medium">{s.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar footer with the three buttons */}
        <div className="mt-auto pt-8 space-y-3">
          <button
            type="button"
            onClick={handleOpenMedia}
            title={
              !isElectron || !out
                ? "Pick an output path in the Electron app first"
                : "Open media folder"
            }
            disabled={!isElectron || !out}
            className={`btn btn-muted h-10 w-full justify-start gap-2 ${
              !isElectron || !out ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <span className="material-symbols-outlined">folder_open</span>
            <span className="truncate">Open media folder</span>
          </button>

          <button
            type="button"
            onClick={handleOpenDocs}
            title="Docs (GitHub)"
            className="btn btn-muted h-10 w-full justify-start gap-2"
          >
            <span className="material-symbols-outlined">help</span>
            <span className="truncate">Docs / GitHub</span>
          </button>

          {/* <div className="text-xs text-[var(--muted)] pt-2">
            {isElectron ? "Electron mode" : "Preview mode (browser)"}
          </div> */}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 px-10 py-9 overflow-auto">
        <div key={step} className={`step-anim-wrapper ${stepAnimClass}`}>
          {renderStepContent()}
        </div>
      </main>
    </div>
  );
}

/* ----------------- Steps ----------------- */

function FilesStep({
  csv,
  out,
  setCsv,
  onPickCsv,
  onPickOut,
  onNext,
}: {
  csv: string | null;
  out: string | null;
  setCsv: (v: string | null) => void;
  onPickCsv: () => void;
  onPickOut: () => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    const extOk = /\.csv$/i.test(f.name || "");
    if (!extOk) {
      alert("Please drop a .csv file.");
      return;
    }
    const path = (f as any).path || f.name;
    setCsv(path);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const extOk = /\.csv$/i.test(f.name || "");
    if (!extOk) {
      alert("Please choose a .csv file.");
      return;
    }
    const path = (f as any).path || f.name;
    setCsv(path);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-[-0.03em]">
          Step 1: Select Your Files
        </h1>
        <p className="text-[var(--muted)] mt-1">
          Choose your CSV file and where to save the Anki package.
        </p>
      </div>

      <div className="space-y-8">
        <div
          className={`dropzone ${
            dragActive ? "dropzone--active" : ""
          } shadow-soft`}
          onDragOver={onDragOver}
          onDragEnter={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={openPicker}
          role="button"
          aria-label="Choose your CSV file"
          title="Drag & drop a CSV here or click to browse"
        >
          <div className="max-w-md">
            <div className="text-lg font-bold mb-2">Choose your CSV file</div>
            <div className="text-sm text-[var(--muted)] mb-4">
              Drag &amp; drop your CSV here or click to browse
            </div>
            <button type="button" className="btn btn-muted">
              Browse
            </button>
            {!!csv && (
              <div className="mt-4 text-sm opacity-85 truncate max-w-[46ch] mx-auto">
                {csv}
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        <div>
          <label className="block text-base font-medium mb-2">
            Select output location for .apkg file
          </label>
          <div className="flex items-center gap-2">
            <input
              className="input rounded-r-none"
              placeholder="/path/to/output.apkg"
              value={out ?? ""}
              readOnly
            />
            <button
              type="button"
              className="btn btn-muted rounded-l-none"
              onClick={onPickOut}
            >
              Browse
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-8">
        <button
          type="button"
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!csv || !out}
          title={!csv || !out ? "Pick a CSV and output first" : "Next"}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function CsvStep({
  csvPath,
  deckName,
  colFront,
  colBack,
  csvDelimiter,
  onChange,
  onBack,
  onNext,
}: {
  csvPath: string | null;
  deckName: string;
  colFront: string;
  colBack: string;
  csvDelimiter: string; // "auto" or actual delimiter char
  onChange: (patch: Partial<any>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const refreshPreview = useCallback(async () => {
    if (!csvPath) return;
    setLoading(true);
    setLoadErr(null);
    setPreview(null);
    try {
      // Map "auto" to undefined so backend will auto-detect.
      const delimiterToUse =
        csvDelimiter && csvDelimiter !== "auto" ? csvDelimiter : undefined;

      const res: CsvPreview = (await (window as any).anki?.previewCsv?.(
        csvPath,
        {
          maxRows: 8,
          maxBytes: 2 * 1024 * 1024,
          delimiter: delimiterToUse,
        }
      )) || { ok: false, header: [], rows: [], delimiter: "," };
      if (!res.ok) {
        setLoadErr(res.error || "Failed to read CSV.");
      }
      setPreview(res);

      // Auto-guess mappings if not set yet
      if (!colFront && res?.header?.length) {
        const guessFront =
          res.header.find((h) => /front|question|source/i.test(h)) ||
          res.header[0];
        if (guessFront) onChange({ colFront: guessFront });
      }
      if (!colBack && res?.header?.length) {
        const guessBack =
          res.header.find((h) => /back|answer|target/i.test(h)) ||
          res.header[1] ||
          res.header[0];
        if (guessBack) onChange({ colBack: guessBack });
      }
    } catch (e: any) {
      setLoadErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [csvPath, colFront, colBack, onChange, csvDelimiter]);

  useEffect(() => {
    if (csvPath) refreshPreview();
  }, [csvPath, refreshPreview]);

  const headerOptions =
    preview?.header?.map((h) => ({ value: h, label: h })) ?? [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-[-0.03em]">
          Step 2: Configure Your Deck
        </h1>
        <p className="text-[var(--muted)] mt-1">
          Map your CSV columns, choose a delimiter if needed, and verify the
          first few rows below.
        </p>
      </div>

      {/* Mapping + Delimiter */}
      <div className="grid gap-8">
        <div className="max-w-xl">
          <label className="flex items-center text-base font-medium mb-2">
            Deck Name
            <InfoTip
              text="Specify the deck name in Anki."
              ariaLabel="Deck Name help"
            />
          </label>
          <input
            className="input"
            placeholder="e.g. Japanese Vocabulary"
            value={deckName}
            onChange={(e) => onChange({ deckName: e.target.value })}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl">
          <div>
            <label className="flex items-center text-base font-medium mb-2">
              Front column
              <InfoTip
                text="Select which CSV column will become the card front."
                ariaLabel="Front column help"
              />
            </label>

            {headerOptions.length ? (
              <Dropdown
                value={colFront}
                onChange={(v) => onChange({ colFront: v })}
                options={headerOptions}
                placeholder="Pick a column…"
              />
            ) : (
              <input
                className="input"
                placeholder="e.g. Front"
                value={colFront}
                onChange={(e) => onChange({ colFront: e.target.value })}
              />
            )}
          </div>

          <div>
            <label className="flex items-center text-base font-medium mb-2">
              Back column
              <InfoTip
                text="Select which CSV column will become the card back."
                ariaLabel="Back column help"
              />
            </label>

            {headerOptions.length ? (
              <Dropdown
                value={colBack}
                onChange={(v) => onChange({ colBack: v })}
                options={headerOptions}
                placeholder="Pick a column…"
              />
            ) : (
              <input
                className="input"
                placeholder="e.g. Back"
                value={colBack}
                onChange={(e) => onChange({ colBack: e.target.value })}
              />
            )}
          </div>

          <div>
            <label className="flex items-center text-base font-medium mb-2">
              Delimiter
              <InfoTip
                text="If auto-detect fails, pick the delimiter your CSV uses (e.g., semicolon for many EU exports, tab for TSV)."
                ariaLabel="Delimiter help"
              />
            </label>
            <Dropdown
              value={csvDelimiter ?? "auto"}
              onChange={(v) => {
                onChange({ csvDelimiter: v });
                setTimeout(() => {
                  if (csvPath) {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    refreshPreview();
                  }
                }, 0);
              }}
              options={DELIMITER_OPTIONS as any}
              placeholder="Auto-detect"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">CSV Preview</h2>
            {preview?.delimiter && (
              <span className="text-xs text-[var(--muted)]">
                Using delimiter:{" "}
                <code>{JSON.stringify(preview.delimiter)}</code>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-muted h-10"
              onClick={refreshPreview}
              disabled={!csvPath || loading}
              title="Reload preview"
            >
              <span className="material-symbols-outlined mr-1">refresh</span>
              {loading ? "Loading…" : "Reload"}
            </button>
          </div>
        </div>

        {!csvPath && (
          <div className="text-[var(--muted)]">No CSV selected yet.</div>
        )}

        {csvPath && (
          <section className="card p-4">
            {loadErr && (
              <div className="mb-3 text-sm text-red-400">
                Failed to load preview: {loadErr}
              </div>
            )}

            {!loadErr && (
              <div className="overflow-auto">
                <table className="table w-full text-sm">
                  <thead>
                    <tr>
                      {(preview?.header ?? []).map((h, idx) => (
                        <th key={idx} className="table-th">
                          {h || <span className="opacity-60">(empty)</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(preview?.rows ?? []).length ? (
                      preview!.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="table-tr">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="table-td">
                              <span className="line-clamp-3 break-words">
                                {cell}
                              </span>
                            </td>
                          ))}
                          {preview!.header &&
                            row.length < preview!.header.length &&
                            Array.from({
                              length: preview!.header.length - row.length,
                            }).map((_, i) => (
                              <td key={`pad-${i}`} className="table-td">
                                <span className="opacity-60">—</span>
                              </td>
                            ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="table-td"
                          colSpan={preview?.header?.length || 1}
                        >
                          <span className="opacity-70">
                            {loading ? "Loading…" : "No rows to preview."}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-8">
        <button type="button" className="btn btn-muted" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNext}
          disabled={!deckName || !colFront || !colBack}
          title={
            !deckName || !colFront || !colBack
              ? "Please choose Deck Name, Front, and Back columns first"
              : "Next"
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}

function VoiceImageStep({
  opts,
  voices,
  onChange,
  onBack,
  onNext,
  onBuild,
  canRun,
  disabledReason,
}: {
  opts: any;
  voices: string[];
  onChange: (patch: Partial<any>) => void;
  onBack: () => void;
  onNext: () => void;
  onBuild: () => void;
  canRun: boolean;
  disabledReason: string | null;
}) {
  // Default the checkbox to checked if the value is undefined.
  const cacheChecked = opts.useImageCache !== false;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-4xl font-black tracking-[-0.03em] mb-8">
        Step 3: Configure Voice and Image Sources
      </h1>

      <div className="grid gap-8">
        <section className="card p-6">
          <h2 className="text-2xl font-bold mb-6">Voice Configuration</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex justify-between flex-col">
              <label className="block text-base font-medium mb-2">Voice</label>
              <VoiceDropdown
                value={opts.voice}
                onChange={(id) => onChange({ voice: id })}
              />
            </div>

            <div>
              <label className="flex items-center text-base font-medium mb-2">
                Text-to-Speech Source
                <InfoTip
                  text="Select which column will be used for text-to-speech."
                  ariaLabel="TTS source help"
                />
              </label>
              <Dropdown
                value={opts.ttsFrom ?? "back"}
                onChange={(v) => onChange({ ttsFrom: v })}
                options={[
                  { value: "front", label: "Front column" },
                  { value: "back", label: "Back column" },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-2xl font-bold mb-6">Image Configuration</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="flex text-base font-medium mb-2 items-center">
                Image Source
                <InfoTip
                  text="Select which column will be used for generating images."
                  ariaLabel="Image source help"
                />
              </label>
              <Dropdown
                value={opts.imagesFrom ?? "back"}
                onChange={(v) => onChange({ imagesFrom: v })}
                options={[
                  { value: "front", label: "Front column" },
                  { value: "back", label: "Back column" },
                ]}
              />
            </div>
            <div>
              <label className="flex items-center text-base font-medium mb-2">
                Image Mode
                <InfoTip
                  text="Select which method of image generation to use."
                  ariaLabel="Image mode help"
                />
              </label>

              <Dropdown
                value={opts.imageMode ?? "search"}
                onChange={(v) => onChange({ imageMode: v })}
                options={[
                  { value: "search", label: "Search (Google/Openverse/Wiki)" },
                  {
                    value: "generate",
                    label: "AI Generate (Pollinations)(Experimental)",
                  },
                ]}
              />
            </div>
          </div>

          {opts.imageMode === "generate" && (
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="text-base font-medium mb-2 flex items-center">
                  AI Gen Image Style
                  <InfoTip
                    text="Choose the visual style for AI-generated images."
                    ariaLabel="AI image style help"
                  />
                </label>
                <p className="text-[var(--muted)] text-xs text-yellow-300 mb-1 mt-1">
                  Uses an open-source model (slow and less accurate); if image
                  generation fails, it fetches from Google—best results with
                  English input.
                </p>
                <Dropdown
                  value={opts.genStyle ?? ""}
                  onChange={(v) => onChange({ genStyle: v })}
                  options={[
                    { value: "anime", label: "Anime" },
                    { value: "comic", label: "Comic" },
                    { value: "illustration", label: "Illustration" },
                    { value: "photorealistic", label: "Photorealistic" },
                    { value: "watercolor", label: "Watercolor" },
                    { value: "3D render", label: "3D Render" },
                  ]}
                />
              </div>
            </div>
          )}

          {/* --- Use cached images toggle (checked by default) --- */}
          <div className="mt-6 flex items-start justify-between gap-4 rounded-lg bg-white/5 p-4">
            <div className="grid">
              <div className="font-semibold">Use cached images</div>
              <div className="text-sm text-[var(--muted)]">
                Reuse existing images if available; otherwise fetch or generate
                new ones.
              </div>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--primary)] cursor-pointer"
                checked={cacheChecked}
                onChange={() => onChange({ useImageCache: !cacheChecked })}
                aria-label="Use cached images"
              />
            </label>
          </div>
        </section>
      </div>

      <div className="flex justify-between pt-8">
        <button type="button" className="btn btn-muted" onClick={onBack}>
          Back
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canRun}
            title={disabledReason ?? "Build deck"}
            onClick={onBuild}
          >
            Build Deck
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressStep({
  running,
  progress,
  hasError,
  cancelRequested,
  doneCode,
  outputs,
  log,
  onCancel,
  onReset,
  onCopy,
  onReveal,
}: {
  running: boolean;
  progress: {
    done: number;
    failed: number;
    queued: number;
    running: number;
    retries: number;
  } | null;
  hasError: boolean;
  cancelRequested: boolean;
  doneCode: number | null;
  outputs: string[];
  log: string;
  onCancel: () => void;
  onReset: () => void;
  onCopy: (t: string) => void;
  onReveal: (p: string) => void;
}) {
  const total =
    (progress?.done ?? 0) +
    (progress?.failed ?? 0) +
    (progress?.running ?? 0) +
    (progress?.queued ?? 0);
  const ratio =
    total > 0 ? Math.min(1, Math.max(0, (progress?.done ?? 0) / total)) : 0;
  const isSuccess = !!outputs.length && !running && !hasError;

  return (
    <div className="max-w-5xl mx-auto">
      {!isSuccess && (
        <>
          <div className="mb-6">
            <h1 className="text-4xl font-black tracking-[-0.03em]">
              Building your Anki deck…
            </h1>
            <p className="text-[var(--muted)]">
              Please wait while we process your file.
            </p>
          </div>

          <div className="flex flex-col gap-6 mb-8">
            <div className="flex justify-between">
              <div className="text-base font-medium">Processing…</div>
              <div className="text-sm">{Math.round(ratio * 100)}%</div>
            </div>
            <div className="h-2.5 bg-[#BFBFBF] rounded-lg overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${Math.round(ratio * 100)}%`,
                  background: "var(--primary)",
                }}
              />
            </div>

            {running && (
              <button
                type="button"
                className="btn h-12 px-5 gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 w-fit"
                onClick={onCancel}
                disabled={cancelRequested}
                title="Cancel current run"
              >
                <span className="material-symbols-outlined !text-xl">
                  stop_circle
                </span>
                {cancelRequested ? "Cancelling…" : "Stop Process"}
              </button>
            )}
          </div>

          <section className="card p-4">
            <div className="font-bold mb-2">Logs</div>
            <pre className="bg-black/25 rounded-md p-4 h-64 overflow-auto text-sm whitespace-pre-wrap">
              {log || "— No log yet —"}
            </pre>
          </section>

          {(hasError || (!running && progress)) && (
            <div className="pt-6">
              <button type="button" className="btn btn-muted" onClick={onReset}>
                Reset
              </button>
            </div>
          )}
        </>
      )}

      {isSuccess && (
        <div className="grid place-items-center text-center card p-10">
          <span
            className="material-symbols-outlined text-green-500 success-icon"
            style={{ fontSize: 96, fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            check_circle
          </span>
          <h2
            className="mt-4 text-4xl font-black fade-up"
            style={{ animationDelay: ".08s" }}
          >
            File Generated Successfully
          </h2>
          <p
            className="text-[var(--muted)] mt-1 fade-up"
            style={{ animationDelay: ".14s" }}
          >
            Your Anki deck has been created and is ready.
          </p>

          {outputs[0] && (
            <div
              className="w-full max-w-xl mt-6 text-left fade-up"
              style={{ animationDelay: ".18s" }}
            >
              <label className="block text-base font-medium mb-2">
                Output file path
              </label>
              <input className="input" readOnly value={outputs[0]} />
            </div>
          )}

          <div
            className="flex gap-3 mt-6 flex-wrap justify-center fade-up"
            style={{ animationDelay: ".22s" }}
          >
            {outputs[0] && (
              <>
                <button
                  type="button"
                  className="btn btn-muted"
                  onClick={() => onCopy(outputs[0])}
                >
                  Copy Path to Clipboard
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onReveal(outputs[0])}
                >
                  Import to Anki
                </button>
              </>
            )}
            <button type="button" className="btn btn-muted" onClick={onReset}>
              Start Over
            </button>
          </div>
        </div>
      )}

      {!running && hasError && !isSuccess && (
        <div className="grid place-items-center text-center card mt-8 p-10">
          <span
            className="material-symbols-outlined text-red-500"
            style={{ fontSize: 72 }}
          >
            error
          </span>
          <h2 className="mt-3 text-3xl font-bold">Generation Failed</h2>
          <p className="text-[var(--muted)] mt-1">
            Something went wrong. Check logs below or try again.
          </p>
          <div className="flex gap-3 mt-6">
            <button type="button" className="btn btn-primary" onClick={onReset}>
              Retry / Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
