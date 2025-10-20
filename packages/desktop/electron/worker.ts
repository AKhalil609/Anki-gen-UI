// packages/desktop/electron/worker.ts
import { parentPort, workerData } from "node:worker_threads";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import * as fs from "node:fs";

const dynamicImport: <T = any>(s: string) => Promise<T> =
  // eslint-disable-next-line no-new-func
  new Function("s", "return import(s)") as any;

async function importCore() {
  // 1) Normal package resolution
  try {
    return await dynamicImport("@anki-one/core");
  } catch {}

  // 2) Fallback candidates (work both in dev and in asar-packed prod)
  const candidates = [
    // relative to compiled worker.js in electron/dist
    path.join(__dirname, "..", "node_modules", "@anki-one", "core", "dist", "index.js"),

    // when __dirname is already inside app.asar/electron/dist
    path.join(__dirname, "..", "..", "node_modules", "@anki-one", "core", "dist", "index.js"),

    // resources path variants (some Electron pack configs unpack node_modules)
    path.join(process.resourcesPath ?? "", "app.asar", "node_modules", "@anki-one", "core", "dist", "index.js"),
    path.join(process.resourcesPath ?? "", "node_modules", "@anki-one", "core", "dist", "index.js"),
  ];

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        return await dynamicImport(pathToFileURL(p).href);
      }
    } catch {}
  }

  throw new Error(
    `Cannot find @anki-one/core. Looked in:\n${candidates.map((c) => ` - ${c}`).join("\n")}`
  );
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
      message: e?.message || String(e),
    });
  }
})();
