// packages/desktop/electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("anki", {
  chooseFile: () => ipcRenderer.invoke("choose-file"),
  chooseOut: () => ipcRenderer.invoke("choose-out"),
  run: (opts: any) => ipcRenderer.send("run-pipeline", opts),
  cancel: () => ipcRenderer.send("cancel-pipeline"),
  onEvent: (cb: (e: any) => void) => {
    const handler = (_e: unknown, data: unknown) => cb(data);
    ipcRenderer.on("pipeline-event", handler);
    // (Optional) return an unsubscribe if you want to remove later:
    // return () => ipcRenderer.off("pipeline-event", handler);
  },
  openPath: (p: string) => ipcRenderer.invoke("open-path", p),
});
