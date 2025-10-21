// electron/worker.ts
import { parentPort, workerData } from "node:worker_threads";
import { pathToFileURL } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";

const dynamicImport: <T=any>(s: string) => Promise<T> =
  new Function("s", "return import(s)") as any;

async function importCore() {
  try {
    // dev/prod if resolvable via node_modules or asar
    return await dynamicImport("@anki-one/core");
  } catch {
    // fallback to file path inside app.asar
    const p = path.resolve(__dirname, "..", "..", "core", "dist", "index.js");
    return await dynamicImport(pathToFileURL(p).href);
  }
}

(async () => {
  try {
    const core = await importCore();
    const { runPipeline } = core;
    await runPipeline(workerData as any, (p: any) => parentPort?.postMessage(p));
  } catch (e: any) {
    parentPort?.postMessage({
      type: "log",
      level: "error",
      // include the stack for easier debugging
      message: (e?.stack || e?.message || String(e)),
    });
  }
})();
