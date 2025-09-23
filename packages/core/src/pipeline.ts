// packages/core/src/pipeline.ts
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { execa } from "execa";
import pLimit from "p-limit";
import prettyMs from "pretty-ms";
import { parse } from "csv-parse";
import { fileURLToPath } from "node:url";

import { ensureDir, buildFilename } from "./util.js";
import { fetchImagesForSentence } from "./image.js";
import { resolveAnkiFactory } from "./private/resolve-factory.js";

/* ---------------- Public types ---------------- */

export type PipelineOptions = {
  input: string;
  deckName: string;
  apkgOut: string;
  mediaDir: string;
  imagesDir: string;
  voice: string;
  rate?: string;
  pitch?: string;
  edgeCmd?: string;   // default: edge-tts
  pythonCmd?: string; // default: python3
  imagesPerNote: number;
  concurrency: number;
  colFront: string;
  colBack: string;
  verbose?: boolean;
  dryRun?: boolean;
  sqlMemoryMB: number;

  // Downsample (accepted for parity with CLI/UI; currently we copy as-is)
  useDownsample: boolean;
  imgMaxWidth: number;
  imgMaxHeight: number;
  imgFormat: "jpeg" | "png" | "webp" | "avif";
  imgQuality: number;
  imgStripMeta: boolean;
  imgNoEnlarge: boolean;

  // Packing
  batchSize: number;

  // Optional override for the python script path (advanced)
  imageScriptPath?: string;
};

export type Progress =
  | { type: "preflight"; message: string }
  | { type: "progress"; queued: number; running: number; done: number; failed: number; retries: number }
  | { type: "log"; level: "info" | "warn" | "error"; message: string }
  | { type: "pack:start"; total: number; parts: number; batchSize: number }
  | { type: "pack:part"; partIndex: number; parts: number; filename: string }
  | { type: "pack:done"; outputs: string[]; durationMs: number };

/* ---------------- Internal helpers ---------------- */

async function readCsv(file: string): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(parse({ columns: true, skip_empty_lines: true, bom: true, trim: true }))
      .on("data", (r: Record<string, string>) => rows.push(r))
      .on("end", () => resolve())
      .on("error", reject);
  });
  return rows;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function deriveBatchFilename(baseApkg: string, partIdx: number, totalParts: number): string {
  if (totalParts <= 1) return baseApkg;
  const dir = path.dirname(baseApkg);
  const ext = path.extname(baseApkg) || ".apkg";
  const name = path.basename(baseApkg, ext);
  const part = String(partIdx + 1).padStart(String(totalParts).length, "0");
  return path.join(dir, `${name}.part${part}${ext}`);
}

/* ---------------- Main ---------------- */

export async function runPipeline(opts: PipelineOptions, onProgress?: (p: Progress) => void) {
  const send = (p: Progress) => onProgress?.(p);
  const started = Date.now();

  const edgeCmd = opts.edgeCmd || "edge-tts";
  const pythonCmd = opts.pythonCmd || "python3";

  // Preflight: external tools
  send({ type: "preflight", message: "Checking external tools (edge-tts, Python packages)..." });
  if (!opts.dryRun) {
    try {
      await execa(edgeCmd, ["--help"], { stdio: opts.verbose ? "inherit" : "ignore" });
    } catch {
      throw new Error(`edge-tts not found (tried "${edgeCmd}")`);
    }
    try {
      await execa(pythonCmd, ["-c", "import icrawler; import edge_tts"], { stdio: "pipe" });
    } catch {
      throw new Error(`Python at "${pythonCmd}" lacks packages: icrawler, edge-tts`);
    }
  }

  if (!opts.dryRun) {
    await ensureDir(opts.mediaDir);
    await ensureDir(opts.imagesDir);
  }

  // Read CSV
  send({ type: "preflight", message: "Reading CSV…" });
  const rows = await readCsv(opts.input);
  if (rows.length === 0) throw new Error("No rows in input CSV.");
  if (!(opts.colFront in rows[0]) || !(opts.colBack in rows[0])) {
    throw new Error(`CSV missing "${opts.colFront}" and/or "${opts.colBack}"`);
  }

  // Resolve packing factory early to fail fast
  send({ type: "preflight", message: "Priming packer (sql.js WASM)…" });
  await resolveAnkiFactory(opts.sqlMemoryMB, !!opts.verbose);

  // Build work
  type Work = { index: number; front: string; back: string; mp3Name?: string; imgNames: string[] };
  const works: Work[] = rows.map((r, i) => ({
    index: i + 1,
    front: r[opts.colFront] || "",
    back: r[opts.colBack] || "",
    imgNames: [],
  }));

  // Progress counters
  const total = works.length;
  let done = 0;
  let failed = 0;
  let running = 0;
  let ttsRetries = 0;
  const limit = pLimit(opts.concurrency);
  const payload = () => ({
    queued: Math.max(0, total - (done + failed + running)),
    running,
    done,
    failed,
    retries: ttsRetries,
  });

  // Compute a robust default path to the Python script inside this package
  // dist/pipeline.js -> ../py/fetch_image.py
  const defaultPyScript = fileURLToPath(new URL("../py/fetch_image.py", import.meta.url));
  const pyScriptPath = opts.imageScriptPath || defaultPyScript;

  // Execute (TTS + images)
  await Promise.all(
    works.map((w) =>
      limit(async () => {
        running++;
        send({ type: "progress", ...payload() });
        try {
          if (!w.back) {
            done++;
            running--;
            send({ type: "progress", ...payload() });
            return;
          }

          // TTS
          const mp3 = buildFilename(w.index, w.back, ".mp3");
          const outPath = path.join(opts.mediaDir, mp3);
          if (!opts.dryRun && !fs.existsSync(outPath)) {
            const args = ["--voice", opts.voice, "--text", w.back, "--write-media", outPath];
            if (opts.rate) args.push("--rate", opts.rate);
            if (opts.pitch) args.push("--pitch", opts.pitch);
            let attempt = 0;
            const maxRetry = 2;
            while (true) {
              attempt++;
              try {
                await execa(edgeCmd, args, { stdio: opts.verbose ? "inherit" : "ignore" });
                break;
              } catch {
                if (attempt > maxRetry) throw new Error(`edge-tts failed after ${maxRetry} retries`);
                ttsRetries++;
                send({ type: "progress", ...payload() });
              }
            }
          }
          w.mp3Name = mp3;

          // Images (pick first). We resolve the script relative to the core package,
          // so packaging/monorepo layouts don't break.
          const found = opts.dryRun
            ? []
            : await fetchImagesForSentence(w.index, w.back, {
                pyPath: pythonCmd,
                scriptPath: pyScriptPath,
                imagesDir: opts.imagesDir,
                count: opts.imagesPerNote,
                verbose: !!opts.verbose,
              });

          if (!opts.dryRun && found.length > 0) {
            const src = found[0];
            const outName = buildFilename(w.index, w.back, path.extname(src) || ".jpg");
            const dest = path.join(opts.mediaDir, outName);
            if (!fs.existsSync(dest)) await fsp.copyFile(src, dest);
            w.imgNames.push(outName);
          }

          done++;
        } catch (e: any) {
          failed++;
          send({ type: "log", level: "warn", message: `Work #${w.index} failed: ${e?.message || e}` });
        } finally {
          running--;
          send({ type: "progress", ...payload() });
        }
      })
    )
  );

  // Pack
  send({ type: "pack:start", total, parts: Math.ceil(total / opts.batchSize), batchSize: opts.batchSize });
  const outputs: string[] = [];
  const batches = chunk(works, Math.max(1, opts.batchSize));
  for (let i = 0; i < batches.length; i++) {
    const part = batches[i];
    const outFile = deriveBatchFilename(opts.apkgOut, i, batches.length);
    send({ type: "pack:part", partIndex: i, parts: batches.length, filename: outFile });

    const apkgFactory = await resolveAnkiFactory(opts.sqlMemoryMB, !!opts.verbose);
    const deck = apkgFactory(batches.length > 1 ? `${opts.deckName} (Part ${i + 1}/${batches.length})` : opts.deckName);

    // media
    const media = new Set<string>();
    for (const w of part) {
      if (w.mp3Name) media.add(w.mp3Name);
      for (const img of w.imgNames) media.add(img);
    }
    for (const m of media) {
      const buf = await fsp.readFile(path.join(opts.mediaDir, m));
      deck.addMedia(m, buf);
    }

    // cards
    for (const w of part) {
      const pieces: string[] = [w.back];
      if (w.mp3Name) pieces.push(`[sound:${w.mp3Name}]`);
      if (w.imgNames.length) pieces.push(`<div><img style="max-width:480px; max-height:320px; width:auto; height:auto;" src="${w.imgNames[0]}"></div>`);
      deck.addCard(w.front, pieces.join(" "));
    }

    const zip = await deck.save();
    fs.writeFileSync(outFile, zip, "binary");
    outputs.push(outFile);
  }

  const durationMs = Date.now() - started;
  send({ type: "pack:done", outputs, durationMs });
  return { outputs, durationMs };
}

export default runPipeline;