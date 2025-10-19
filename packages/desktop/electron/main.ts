import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { Worker } from "node:worker_threads";

let win: BrowserWindow | null = null;
let currentWorker: Worker | null = null;

/** Safely send an event to the renderer */
function send(evt: any) {
  try {
    if (win && !win.isDestroyed()) {
      win.webContents.send("pipeline-event", evt);
    }
  } catch (err) {
    console.error("[main] send failed:", err);
  }
}

/** Terminate any in-flight worker (used for cancel or before re-run) */
async function terminateCurrentWorker(reason: "cancel" | "replace") {
  if (!currentWorker) return;
  try {
    await currentWorker.terminate();
    send({
      type: "log",
      level: "warn",
      message: reason === "cancel" ? "Cancelled by user." : "Previous run stopped.",
    });
    send({ type: "done", code: reason === "cancel" ? 2 : 3 });
  } catch (e: any) {
    console.error("[main] terminate error:", e);
    send({ type: "log", level: "error", message: String(e?.message || e) });
    send({ type: "done", code: 1 });
  } finally {
    currentWorker = null;
  }
}

/** Minimal, safe header-only CSV parsing (first line), with quotes + BOM support */
function readCsvHeader(csvPath: string): string[] {
  const MAX_BYTES = 256 * 1024; // plenty for a single long header line
  const fd = fs.openSync(csvPath, "r");
  try {
    const buf = Buffer.allocUnsafe(MAX_BYTES);
    const bytesRead = fs.readSync(fd, buf, 0, MAX_BYTES, 0);
    let chunk = buf.slice(0, bytesRead).toString("utf8");
    // Normalize newlines and strip BOM if present
    if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1);
    chunk = chunk.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const firstLine = chunk.split("\n")[0] ?? "";
    const delimiter = detectDelimiter(firstLine);

    return parseCsvLine(firstLine, delimiter);
  } finally {
    fs.closeSync(fd);
  }
}

/** Preflight: verify CSV has the requested column headers */
function csvHasColumns(csvPath: string, required: string[]): { ok: boolean; missing: string[]; header?: string[] } {
  try {
    const header = readCsvHeader(csvPath).map((h) => String(h).trim());
    const missing = required.filter((r) => !header.includes(r));
    return { ok: missing.length === 0, missing, header };
  } catch (err: any) {
    return { ok: false, missing: [`Failed to read CSV: ${err?.message || err}`] };
  }
}

/* ---------- CSV preview (header + first N rows) ---------- */

function detectDelimiter(firstLine: string): string {
  // Basic heuristic: prefer the most frequent among , ; \t | (pipes common too)
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const c = (firstLine.match(new RegExp(`\\${d}`, "g")) || []).length;
    if (c > bestCount) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((s) => s.trim());
}

function parseCsvChunkToRows(
  chunk: string,
  delimiter: string,
  maxRows: number
): string[][] {
  // Normalize newlines and strip BOM if present
  if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1);
  chunk = chunk.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < chunk.length; i++) {
    const ch = chunk[i];

    if (ch === '"') {
      if (inQuotes && chunk[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && ch === "\n") {
      row.push(cell);
      rows.push(row.map((c) => c.trim()));
      cell = "";
      row = [];
      if (rows.length >= maxRows + 1 /* header + N rows */) break;
      continue;
    }

    cell += ch;
  }

  // Push last row if chunk didn’t end with newline
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row.map((c) => c.trim()));
  }

  return rows;
}

function readCsvPreview(csvPath: string, maxRows: number, maxBytes: number) {
  const fd = fs.openSync(csvPath, "r");
  try {
    const stat = fs.fstatSync(fd);
    const toRead = Math.min(stat.size, Math.max(32 * 1024, maxBytes)); // at least 32 KB
    const buf = Buffer.allocUnsafe(toRead);
    const bytesRead = fs.readSync(fd, buf, 0, toRead, 0);
    let chunk = buf.slice(0, bytesRead).toString("utf8");

    // Detect delimiter based on first line
    const firstLine = chunk.split(/\r\n|\r|\n/)[0] ?? "";
    const delimiter = detectDelimiter(firstLine);

    const rows = parseCsvChunkToRows(chunk, delimiter, maxRows);
    if (!rows.length) {
      return { ok: false, error: "No content found", header: [], rows: [], delimiter };
    }

    const header = rows[0] ?? [];
    const data = rows.slice(1, 1 + maxRows);

    // Pad rows so table widths are stable
    const width = header.length;
    const padded = data.map((r) =>
      r.length < width ? [...r, ...Array(width - r.length).fill("")] : r
    );

    return { ok: true, header, rows: padded, delimiter };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || String(err),
      header: [],
      rows: [],
      delimiter: ",",
    };
  } finally {
    fs.closeSync(fd);
  }
}

/* ---------------- Electron app window ---------------- */

function createWindow() {
  if (!app.isPackaged) {
    app.commandLine.appendSwitch("enable-features", "NetworkServiceInProcess");
  }

  const isDev = !app.isPackaged;
  const forceDevtools = process.argv.includes("--devtools");

  const preloadPath = path.join(__dirname, "preload.js");
  const prodIndexHtml = path.join(app.getAppPath(), "dist", "index.html");

  win = new BrowserWindow({
    width: 1200,
    height: 692,
    useContentSize: true,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: "#101922",
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[main] did-fail-load", { code, desc, url });
  });
  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[main] render-process-gone", details);
  });
  win.on("unresponsive", () => console.error("[main] window unresponsive"));
  win.on("ready-to-show", () => {
    if (win && !win.isDestroyed()) win.show();
  });
  win.on("closed", () => {
    win = null;
  });

  if (!app.isPackaged) {
    const url = "http://localhost:5175";
    win.loadURL(url).catch((err) => console.error("[main] loadURL error:", err));
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    if (!fs.existsSync(prodIndexHtml)) {
      const msg =
        `Production index.html not found.\n` +
        `Tried: ${prodIndexHtml}\n\n` +
        `Ensure "dist/**" is included in electron-builder "files" and Vite build ran.`;
      console.error("[main] MISSING index.html:", prodIndexHtml);
      dialog.showErrorBox("Anki One – Missing index.html", msg);
    }

    win.loadFile(prodIndexHtml).catch((err) => console.error("[main] loadFile error:", err));
    if (forceDevtools) win.webContents.openDevTools({ mode: "detach" });
  }
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else if (win) win.show();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

/* ------------- IPC handlers ------------- */

ipcMain.handle("choose-file", async () => {
  const res = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });
  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle("choose-out", async () => {
  const res = await dialog.showSaveDialog({
    defaultPath: "deck.apkg",
    filters: [{ name: "Anki Deck", extensions: ["apkg"] }],
  });
  return res.canceled ? null : res.filePath;
});

ipcMain.handle("open-path", async (_evt, filePath: string) => {
  try {
    const result = await shell.openPath(filePath);
    if (result) {
      console.error("[open-path] error:", result);
      return { ok: false, error: result };
    }
    return { ok: true };
  } catch (err: any) {
    console.error("[open-path] exception:", err);
    return { ok: false, error: err?.message || String(err) };
  }
});

/** CSV preview: header + first N rows (fast + safe) */
ipcMain.handle(
  "preview-csv",
  async (_evt, filePath: string, opts?: { maxRows?: number; maxBytes?: number }) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { ok: false, error: "CSV path missing or not found", header: [], rows: [], delimiter: "," };
      }
      const maxRows = Math.max(1, Math.min(50, opts?.maxRows ?? 8));
      const maxBytes = Math.max(32 * 1024, Math.min(8 * 1024 * 1024, opts?.maxBytes ?? 2 * 1024 * 1024));
      return readCsvPreview(filePath, maxRows, maxBytes);
    } catch (e: any) {
      return {
        ok: false,
        error: e?.message || String(e),
        header: [],
        rows: [],
        delimiter: ",",
      };
    }
  }
);

ipcMain.on("cancel-pipeline", async () => {
  await terminateCurrentWorker("cancel");
});

/** Run the heavy pipeline in a worker so the UI stays responsive */
ipcMain.on("run-pipeline", async (evt, payload) => {
  try {
    if (currentWorker) {
      await terminateCurrentWorker("replace");
    }

    const { input, colFront, colBack } = payload || {};
    if (!input || !fs.existsSync(input)) {
      send({ type: "log", level: "error", message: "CSV path is missing or not found." });
      send({ type: "done", code: 1 });
      return;
    }

    // Preflight header check (no third-party dependency)
    const reqCols = [String(colFront || ""), String(colBack || "")].filter(Boolean);
    if (reqCols.length === 2) {
      const { ok, missing, header } = csvHasColumns(input, reqCols);
      if (!ok) {
        send({
          type: "log",
          level: "error",
          message: `CSV is missing required column(s): ${missing.join(", ")}`
            + (header ? `\nDetected header: [${header.join(", ")}]` : ""),
        });
        send({ type: "done", code: 1 });
        return;
      }
    }

    const workerPath = path.join(__dirname, "worker.js");
    currentWorker = new Worker(workerPath, { workerData: { ...payload } });

    const channel = evt.sender;

    currentWorker.on("message", (m) => {
      channel.send("pipeline-event", m);
    });

    currentWorker.on("error", (e) => {
      console.error("[worker] error:", e);
      channel.send("pipeline-event", {
        type: "log",
        level: "error",
        message: e?.message || String(e),
      });
      channel.send("pipeline-event", { type: "done", code: 1 });
      currentWorker = null;
    });

    currentWorker.on("exit", (code) => {
      channel.send("pipeline-event", { type: "done", code });
      currentWorker = null;
    });
  } catch (e: any) {
    console.error("[main] failed to start worker:", e);
    evt.sender.send("pipeline-event", {
      type: "log",
      level: "error",
      message: e?.message || String(e),
    });
    evt.sender.send("pipeline-event", { type: "done", code: 1 });
    currentWorker = null;
  }
});
