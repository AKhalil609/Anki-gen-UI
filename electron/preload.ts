import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("anki", {
  chooseFile: () => ipcRenderer.invoke("choose-file"),
  chooseOut: () => ipcRenderer.invoke("choose-out"),
  run: (opts: any) => ipcRenderer.send("run-pipeline", opts),
  cancel: () => ipcRenderer.send("cancel-pipeline"),
  onEvent: (cb: (e: any) => void) => {
    const handler = (_e: unknown, data: unknown) => cb(data as any);
    ipcRenderer.on("pipeline-event", handler);
    return () => ipcRenderer.off("pipeline-event", handler);
  },
  openPath: (p: string) => ipcRenderer.invoke("open-path", p),

  /** Get a small preview of the CSV: header + first few rows (safe, fast). */
  previewCsv: (
    filePath: string,
    opts?: { maxRows?: number; maxBytes?: number; delimiter?: string }
  ) => ipcRenderer.invoke("preview-csv", filePath, opts ?? {}),
});
