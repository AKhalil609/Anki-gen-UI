import { parentPort, workerData } from "node:worker_threads";

// create a dynamic import that TS won't transform to require()
const dynamicImport: <T = any>(s: string) => Promise<T> =
  // eslint-disable-next-line no-new-func
  new Function("s", "return import(s)") as any;

(async () => {
  try {
    const { runPipeline } = await dynamicImport("@anki-one/core");
    await runPipeline(
      workerData as any,
      (p: any) => parentPort?.postMessage(p)
    );
  } catch (e: any) {
    parentPort?.postMessage({
      type: "log",
      level: "error",
      message: e?.message || String(e),
    });
  }
})();