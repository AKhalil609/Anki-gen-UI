import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("anki", {
  chooseFile: () => ipcRenderer.invoke("choose-file"),
  chooseOut: () => ipcRenderer.invoke("choose-out"),
  run: (opts: any) => ipcRenderer.send("run-pipeline", opts),
  onEvent: (cb: (e: any) => void) => {
    ipcRenderer.on("pipeline-event", (_e, data) => cb(data));
  },
  openPath: (path: string) => ipcRenderer.invoke("open-path", path)
});
