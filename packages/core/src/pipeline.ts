// packages/core/src/pipeline.ts
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import pLimit from "p-limit";
import { parse } from "csv-parse";

import { ensureDir, buildFilename } from "./util.js";
import { resolveAnkiFactory } from "./private/resolve-factory.js";
import { synthesizeToFile } from "./tts.js";
import { fetchImagesNode } from "./image-node.js";

function imageQueryFromSentence(s: string): string {
  // Prefer the first (...) group if present
  const paren = s.match(/\(([^)]+)\)/);
  if (paren && paren[1]) {
    // Clean up: drop articles like der/die/das/den/dem if present at start
    const w = paren[1].trim();
    return w.replace(/^(der|die|das|den|dem|des)\s+/i, "").trim();
  }
  // Fallback: take the first 2 tokens that look like words (avoid punctuation)
  const tokens = (s.match(/[A-Za-zÄÖÜäöüß]+/g) || []).slice(0, 2);
  return tokens.join(" ");
}

function colorizeParenWord(back: string): string {
  const m = back.match(/\(([^)]+)\)/); // first (…) group only
  if (!m) return back;

  const term = m[1].trim();
  const lower = term.toLowerCase();

  // Default yellow (verbs/others)
  let color = "#ca8a04"; // yellow-600

  if (/^(der|die|das)\s+/.test(lower)) {
    if (lower.startsWith("der ")) color = "#1e40af"; // blue-800
    if (lower.startsWith("die ")) color = "#dc2626"; // red-600
    if (lower.startsWith("das ")) color = "#16a34a"; // green-600
  } else if (/^[a-zäöüß]+(en|ern|eln)$/i.test(lower)) {
    // heuristic for infinitive verbs
    color = "#ca8a04"; // yellow-600
  } else {
    color = "#ca8a04"; // yellow-600
  }

  const span = `<span style="color:${color}">${term}</span>`;
  return back.replace(m[0], `(${span})`);
}

/* ---------------- Public types ---------------- */

export type PipelineOptions = {
  input: string;
  deckName: string;
  apkgOut: string;
  mediaDir: string;
  imagesDir: string;

  // TTS
  voice: string;
  rate?: string; // e.g. "+10%"
  pitch?: string; // e.g. "+2Hz"
  volume?: string; // e.g. "+0%"

  // Images (Node only, using g-i-s)
  imagesPerNote: number;

  // Pipeline
  concurrency: number;
  colFront: string;
  colBack: string;
  verbose?: boolean;
  dryRun?: boolean;
  sqlMemoryMB: number;

  // Downsample (parity placeholders; currently copy as-is)
  useDownsample: boolean;
  imgMaxWidth: number;
  imgMaxHeight: number;
  imgFormat: "jpeg" | "png" | "webp" | "avif";
  imgQuality: number;
  imgStripMeta: boolean;
  imgNoEnlarge: boolean;

  // Packing
  batchSize: number;
};

export type Progress =
  | { type: "preflight"; message: string }
  | {
      type: "progress";
      queued: number;
      running: number;
      done: number;
      failed: number;
      retries: number;
    }
  | { type: "log"; level: "info" | "warn" | "error"; message: string }
  | { type: "pack:start"; total: number; parts: number; batchSize: number }
  | { type: "pack:part"; partIndex: number; parts: number; filename: string }
  | { type: "pack:done"; outputs: string[]; durationMs: number };

/* ---------------- Internal helpers ---------------- */

async function readCsv(file: string): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(
        parse({ columns: true, skip_empty_lines: true, bom: true, trim: true })
      )
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

function deriveBatchFilename(
  baseApkg: string,
  partIdx: number,
  totalParts: number
): string {
  if (totalParts <= 1) return baseApkg;
  const dir = path.dirname(baseApkg);
  const ext = path.extname(baseApkg) || ".apkg";
  const name = path.basename(baseApkg, ext);
  const part = String(partIdx + 1).padStart(String(totalParts).length, "0");
  return path.join(dir, `${name}.part${part}${ext}`);
}

/* ---------------- Main ---------------- */

export async function runPipeline(
  opts: PipelineOptions,
  onProgress?: (p: Progress) => void
) {
  const send = (p: Progress) => onProgress?.(p);
  const started = Date.now();

  // Preflight (no external CLIs / Python)
  send({ type: "preflight", message: "Preparing output folders…" });
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

  // Build work list
  type Work = {
    index: number;
    front: string;
    back: string;
    mp3Name?: string;
    imgNames: string[];
  };
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

          // ---------- TTS ----------
          const mp3 = buildFilename(w.index, w.back, ".mp3");
          const outPath = path.join(opts.mediaDir, mp3);
          if (!opts.dryRun && !fs.existsSync(outPath)) {
            let attempt = 0;
            const maxRetry = 2;
            while (true) {
              attempt++;
              try {
                await synthesizeToFile({
                  text: w.back,
                  voice: opts.voice,
                  rate: opts.rate,
                  pitch: opts.pitch,
                  volume: opts.volume,
                  outFile: outPath,
                  verbose: !!opts.verbose,
                });
                break;
              } catch (err) {
                if (attempt > maxRetry) {
                  throw new Error(
                    `edge-tts-universal failed after ${maxRetry} retries: ${String(
                      err
                    )}`
                  );
                }
                ttsRetries++;
                send({ type: "progress", ...payload() });
              }
            }
          }
          w.mp3Name = mp3;

          // ---------- Images (g-i-s; no Puppeteer, no keys) ----------
          const query = imageQueryFromSentence(w.back);
          const found = opts.dryRun
            ? []
            : await fetchImagesNode(w.index, query, {
                imagesDir: opts.imagesDir,
                count: opts.imagesPerNote,
                verbose: !!opts.verbose,
              });

          if (!opts.dryRun && found.length > 0) {
            const src = found[0];
            const outName = buildFilename(
              w.index,
              w.back,
              path.extname(src) || ".jpg"
            );
            const dest = path.join(opts.mediaDir, outName);
            if (!fs.existsSync(dest)) await fsp.copyFile(src, dest);
            w.imgNames.push(outName);
          }

          done++;
        } catch (e: any) {
          failed++;
          send({
            type: "log",
            level: "warn",
            message: `Work #${w.index} failed: ${e?.message || e}`,
          });
        } finally {
          running--;
          send({ type: "progress", ...payload() });
        }
      })
    )
  );

  // Pack
  send({
    type: "pack:start",
    total,
    parts: Math.ceil(total / opts.batchSize),
    batchSize: opts.batchSize,
  });
  const outputs: string[] = [];
  const batches = chunk(works, Math.max(1, opts.batchSize));
  for (let i = 0; i < batches.length; i++) {
    const part = batches[i];
    const outFile = deriveBatchFilename(opts.apkgOut, i, batches.length);
    send({
      type: "pack:part",
      partIndex: i,
      parts: batches.length,
      filename: outFile,
    });

    const apkgFactory = await resolveAnkiFactory(
      opts.sqlMemoryMB,
      !!opts.verbose
    );
    const deck = apkgFactory(
      batches.length > 1
        ? `${opts.deckName} (Part ${i + 1}/${batches.length})`
        : opts.deckName
    );

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
      const formattedBack = colorizeParenWord(w.back);
      const pieces: string[] = [formattedBack];
      if (w.mp3Name) pieces.push(`[sound:${w.mp3Name}]`);
      if (w.imgNames.length) {
        pieces.push(
          `<div><img style="max-width:480px; max-height:320px; width:auto; height:auto;" src="${w.imgNames[0]}"></div>`
        );
      }
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
