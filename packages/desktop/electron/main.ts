// packages/desktop/electron/main.ts
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { Worker } from "node:worker_threads";

let win: BrowserWindow | null = null;

function createWindow() {
  // Helpful in dev on some macOS setups (optional):
  if (!app.isPackaged) {
    app.commandLine.appendSwitch("enable-features", "NetworkServiceInProcess");
  }

  const isDev = !app.isPackaged;
  const forceDevtools = process.argv.includes("--devtools");

  // __dirname resolves to ".../electron/dist" at runtime
  const preloadPath = path.join(__dirname, "preload.js");

  // In production, app.getAppPath() points to app.asar root.
  // Vite build outputs to "dist" at the app root (included via electron-builder "files").
  const prodIndexHtml = path.join(app.getAppPath(), "dist", "index.html");

  console.log("[main] __dirname:", __dirname);
  console.log("[main] preload:", preloadPath);
  console.log("[main] isDev:", isDev);
  if (!isDev) console.log("[main] prod indexHtml:", prodIndexHtml);

  win = new BrowserWindow({
    width: 980,
    height: 720,
    show: false, // show after ready-to-show
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Robust logging
  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[main] did-fail-load", { code, desc, url });
  });
  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[main] render-process-gone", details);
  });
  win.on("unresponsive", () => console.error("[main] window unresponsive"));
  win.on("ready-to-show", () => {
    console.log("[main] ready-to-show");
    if (win && !win.isDestroyed()) win.show();
  });
  win.on("closed", () => {
    console.log("[main] window closed");
    win = null;
  });

  if (isDev) {
    const url = "http://localhost:5175";
    console.log("[main] loading dev URL:", url);
    win
      .loadURL(url)
      .catch((err) => console.error("[main] loadURL error:", err));
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    // Sanity check: if index.html isn't present, show an error dialog with the path we tried.
    if (!fs.existsSync(prodIndexHtml)) {
      const msg =
        `Production index.html not found.\n` +
        `Tried: ${prodIndexHtml}\n\n` +
        `Ensure "dist/**" is included in electron-builder "files" and Vite build ran.`;
      console.error("[main] MISSING index.html:", prodIndexHtml);
      dialog.showErrorBox("Anki One – Missing index.html", msg);
    }

    console.log("[main] loading file URL:", prodIndexHtml);
    win
      .loadFile(prodIndexHtml)
      .catch((err) => console.error("[main] loadFile error:", err));

    if (forceDevtools) {
      win.webContents.openDevTools({ mode: "detach" });
    }
  }
}

// Single instance lock (mac-friendly)
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
      // shell.openPath returns error string on failure
      console.error("[open-path] error:", result);
      return { ok: false, error: result };
    }
    return { ok: true };
  } catch (err: any) {
    console.error("[open-path] exception:", err);
    return { ok: false, error: err?.message || String(err) };
  }
});

// Run the heavy pipeline in a worker so the UI stays responsive
ipcMain.on("run-pipeline", (evt, payload) => {
  try {
    const workerPath = path.join(__dirname, "worker.js");
    console.log("[main] starting worker", workerPath);
    const worker = new Worker(workerPath, { workerData: { ...payload } });
    const channel = evt.sender;
    worker.on("message", (m) => {
      console.log("[worker:event]", m);
      channel.send("pipeline-event", m);
    });
    worker.on("error", (e) => {
      console.error("[worker] error:", e);
      channel.send("pipeline-event", {
        type: "log",
        level: "error",
        message: e?.message || String(e),
      });
    });
    worker.on("exit", (code) => {
      console.log("[worker] exit code:", code);
      channel.send("pipeline-event", { type: "done", code });
    });
  } catch (e: any) {
    console.error("[main] failed to start worker:", e);
    evt.sender.send("pipeline-event", {
      type: "log",
      level: "error",
      message: e?.message || String(e),
    });
  }
});
