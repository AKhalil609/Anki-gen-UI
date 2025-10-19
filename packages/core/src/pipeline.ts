// /Users/ahmedhegab/Projects/anki-ui/anki-one/packages/core/src/pipeline.ts

import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import pLimit from "p-limit";
import { parse } from "csv-parse";

import { ensureDir, buildFilename } from "./util.js";
import { resolveAnkiFactory } from "./private/resolve-factory.js";
import { synthesizeToFile } from "./tts.js";
import {
  fetchImagesNode,
  type ImageResult as SearchImageResult,
} from "./image-node.js";
import {
  generateImagesPollinations,
  type ImageResult as GenImageResult,
} from "./image-gen-pollinations.js";

/* ---------------- Helpers ---------------- */

function imageQueryFromSentence(s: string): string {
  const paren = s.match(/\(([^)]+)\)/);
  if (paren && paren[1]) {
    const w = paren[1].trim();
    return w.replace(/^(der|die|das|den|dem|des)\s+/i, "").trim();
  }
  return s.trim();
}

function colorizeParenWord(back: string): string {
  const m = back.match(/\(([^)]+)\)/);
  if (!m) return back;
  const term = m[1].trim();
  const lower = term.toLowerCase();
  let color = "#ca8a04";
  if (/^(der|die|das)\s+/.test(lower)) {
    if (lower.startsWith("der ")) color = "#1e40af";
    if (lower.startsWith("die ")) color = "#dc2626";
    if (lower.startsWith("das ")) color = "#16a34a";
  } else if (/^[a-zäöüß]+(en|ern|eln)$/i.test(lower)) {
    color = "#ca8a04";
  }
  const span = `<span style="color:${color}">${term}</span>`;
  return back.replace(m[0], `(${span})`);
}

/* ---------- Prompt building ---------- */

function extractParenTerm(s: string): string | null {
  const m = s.match(/\(([^)]+)\)/);
  return m ? m[1].trim() : null;
}

/** Replace "(text)" with " text " (keep the word), then tidy spacing/punctuation. */
function cleanSentence(s: string): string {
  if (!s) return "";
  let out = s.replace(/\(([^)]+)\)/g, (_m, inner) => ` ${inner} `);
  out = out
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/([(\[])\s+/g, "$1")
    .trim();
  out = out.replace(/\.{2,}/g, ".");
  if (!/[.!?]$/.test(out)) out += ".";
  return out;
}

/** Build prompt from the chosen column text, with strong “no text” constraint. */
function buildGenerationPrompt(text: string, style?: string) {
  const english = cleanSentence(text);
  const term = extractParenTerm(text) || "";
  const focus = term
    ? ` Emphasize "${term}" as the main, clearly recognizable subject.`
    : "";
  const styleHint = style ? ` Style: ${style}.` : "";
  const noText =
    " No text, letters, numbers, captions, watermarks, logos, or typography.";
  return `${english} The image should represent this sentence faithfully.${focus}${styleHint}${noText} Simple composition, clean background if needed.`;
}

/* ---------- Cache helpers ---------- */

async function listCached(folder: string, count: number): Promise<string[]> {
  try {
    const entries = await fsp.readdir(folder, { withFileTypes: true });
    const files = entries
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .slice(0, Math.max(0, count))
      .map((name) => path.join(folder, name));
    return files;
  } catch {
    return [];
  }
}

async function clearDirIfExists(folder: string) {
  try {
    await fsp.rm(folder, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function genOutFolder(imagesDir: string, index: number, prompt: string) {
  const slug = buildFilename(index, prompt, ""); // no ext
  return path.join(imagesDir, slug || "img");
}

function searchOutFolder(imagesDir: string, index: number, query: string) {
  const slug = buildFilename(index, query, ""); // no ext
  return path.join(imagesDir, slug || "img");
}

/* ---------- CSV delimiter detection ---------- */

/** Pick the most frequent candidate in the header line */
function detectDelimiterFromHeader(firstLine: string): string {
  const candidates = [",", ";", "\t", "|", ":"];
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

function detectDelimiterFromFile(file: string): string {
  const fd = fs.openSync(file, "r");
  try {
    const buf = Buffer.allocUnsafe(64 * 1024);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    let chunk = buf.slice(0, n).toString("utf8");
    if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1);
    const firstLine = chunk
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")[0] ?? "";
    return detectDelimiterFromHeader(firstLine);
  } finally {
    fs.closeSync(fd);
  }
}

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
  volume?: string;
  imagesPerNote: number;
  concurrency: number;
  colFront: string;
  colBack: string;
  verbose?: boolean;
  dryRun?: boolean;
  sqlMemoryMB: number;
  useDownsample: boolean;
  imgMaxWidth: number;
  imgMaxHeight: number;
  imgFormat: "jpeg" | "png" | "webp" | "avif";
  imgQuality: number;
  imgStripMeta: boolean;
  imgNoEnlarge: boolean;
  batchSize: number;

  // Generation & cache options
  imageMode?: "search" | "generate";
  genProvider?: "pollinations";
  genStyle?: string;
  useImageCache?: boolean;

  // NEW: source selectors
  ttsFrom?: "front" | "back";
  imagesFrom?: "front" | "back";

  // NEW: CSV delimiter override; undefined = auto-detect
  csvDelimiter?: string; // ",", ";", "\t", "|", ":" or undefined
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

type Logger = (level: "info" | "warn" | "error", message: string) => void;

async function readCsv(
  file: string,
  delimiterOverride?: string,
  log?: Logger
): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];

  // Decide delimiter once, then stick to it
  const delimiter =
    delimiterOverride && delimiterOverride.length
      ? delimiterOverride
      : detectDelimiterFromFile(file);

  log?.("info", `CSV: using delimiter ${JSON.stringify(delimiter)}`);

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(
        parse({
          columns: true,                 // use header row as keys
          delimiter,                     // ← critical for ; \t | :
          bom: true,
          trim: true,
          skip_empty_lines: true,

          // Be generous to avoid false "Invalid Record Length"
          relax_quotes: true,
          relax_column_count: true,
          record_delimiter: ["\r\n", "\n", "\r"],

          // Typical CSV quoting
          escape: '"',
          quote: '"',
        })
      )
      .on("data", (r: Record<string, string>) => rows.push(r))
      .on("end", () => resolve())
      .on("error", (err) => {
        const msg =
          `Failed to parse CSV with delimiter ${JSON.stringify(delimiter)}: ` +
          (err?.message || String(err));
        reject(new Error(msg));
      });
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
  const log: Logger = (level, message) => send({ type: "log", level, message });
  const started = Date.now();

  send({ type: "preflight", message: "Preparing output folders…" });
  if (!opts.dryRun) {
    await ensureDir(opts.mediaDir);
    await ensureDir(opts.imagesDir);
  }

  // Resolve defaults
  const resolvedProvider = (opts.genProvider ?? "pollinations") as "pollinations";
  const resolvedMode = opts.imageMode ?? "search";
  const useCache = !!(opts.useImageCache ?? true);

  const ttsFrom = (opts.ttsFrom ?? "back") as "front" | "back";
  const imagesFrom = (opts.imagesFrom ?? "back") as "front" | "back";

  send({
    type: "log",
    level: "info",
    message:
      `Image mode: ${
        resolvedMode === "generate" ? `generate/${resolvedProvider}` : "search"
      }${opts.genStyle ? ` (style: ${opts.genStyle})` : ""} • cache: ${
        useCache ? "on" : "off"
      } • ttsFrom=${ttsFrom} • imagesFrom=${imagesFrom}`,
  });

  send({ type: "preflight", message: "Reading CSV…" });
  const rows = await readCsv(opts.input, opts.csvDelimiter, log);
  if (rows.length === 0) throw new Error("No rows in input CSV.");

  if (!(opts.colFront in rows[0]) || !(opts.colBack in rows[0])) {
    throw new Error(`CSV missing "${opts.colFront}" and/or "${opts.colBack}"`);
  }

  send({ type: "preflight", message: "Priming packer (sql.js WASM)…" });
  await resolveAnkiFactory(opts.sqlMemoryMB, !!opts.verbose);

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

  await Promise.all(
    works.map((w) =>
      limit(async () => {
        running++;
        send({ type: "progress", ...payload() });
        try {
          // Nothing to do if both sides are empty
          if (!w.back && !w.front) {
            done++;
            running--;
            send({ type: "progress", ...payload() });
            return;
          }

          // ---------- TTS (pick source) ----------
          const ttsText = ttsFrom === "front" ? w.front : w.back;
          if (ttsText) {
            const mp3 = buildFilename(w.index, ttsText, ".mp3");
            const outPath = path.join(opts.mediaDir, mp3);
            if (!opts.dryRun && !fs.existsSync(outPath)) {
              let attempt = 0;
              const maxRetry = 2;
              while (true) {
                attempt++;
                try {
                  await synthesizeToFile({
                    text: ttsText,
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
          }

          // ---------- Images (pick source) ----------
          const usingGen =
            resolvedMode === "generate" && resolvedProvider === "pollinations";
          const imageText = imagesFrom === "front" ? w.front : w.back;

          let found: (SearchImageResult | GenImageResult)[] = [];

          if (!opts.dryRun && imageText) {
            // Compute folders for cache management
            const prompt = buildGenerationPrompt(imageText, opts.genStyle);
            const genFolder = genOutFolder(opts.imagesDir, w.index, prompt);

            const searchQuery = imageQueryFromSentence(imageText);
            const searchFolder = searchOutFolder(
              opts.imagesDir,
              w.index,
              searchQuery
            );

            if (useCache) {
              // 1) Try cache for current mode first
              if (usingGen) {
                const cached = await listCached(genFolder, opts.imagesPerNote);
                if (cached.length) {
                  send({
                    type: "log",
                    level: "info",
                    message: `[#${w.index}] cache hit (generate): ${cached.length} file(s)`,
                  });
                  found = cached.map((p) => ({
                    path: p,
                    source: "cache/pollinations",
                  }));
                }
              } else {
                const cached = await listCached(
                  searchFolder,
                  opts.imagesPerNote
                );
                if (cached.length) {
                  send({
                    type: "log",
                    level: "info",
                    message: `[#${w.index}] cache hit (search): ${cached.length} file(s)`,
                  });
                  found = cached.map((p) => ({
                    path: p,
                    source: "cache/search",
                  }));
                }
              }
            } else {
              // 2) Bypass cache: clear both potential folders to guarantee fresh images
              await clearDirIfExists(genFolder);
              await clearDirIfExists(searchFolder);
              send({
                type: "log",
                level: "info",
                message: `[#${w.index}] cache bypass: cleared note image folders`,
              });
            }

            // 3) If we still need more images than cached provided, fetch/generate
            const shortBy = Math.max(
              0,
              (opts.imagesPerNote || 1) - (found.length || 0)
            );

            if (shortBy > 0) {
              if (usingGen) {
                send({
                  type: "log",
                  level: "info",
                  message: `[#${w.index}] gen/pollinations prompt${
                    opts.genStyle ? ` [style=${opts.genStyle}]` : ""
                  }: ${prompt}`,
                });
                try {
                  const generated = await generateImagesPollinations(
                    w.index,
                    prompt,
                    {
                      imagesDir: opts.imagesDir,
                      count: shortBy, // only fill the gap
                      style: opts.genStyle,
                      verbose: !!opts.verbose,
                    }
                  );
                  if (generated.length) {
                    found = found.concat(generated);
                  }
                } catch (e: any) {
                  send({
                    type: "log",
                    level: "warn",
                    message: `[#${w.index}] generation error: ${
                      e?.message || e
                    }`,
                  });
                }
              }

              // 4) Fallback to search if still short
              if (found.length < (opts.imagesPerNote || 1)) {
                const stillShortBy =
                  (opts.imagesPerNote || 1) - (found.length || 0);
                send({
                  type: "log",
                  level: "info",
                  message: `[#${w.index}] search fallback query: "${searchQuery}" (need ${stillShortBy})`,
                });
                const searched = await fetchImagesNode(
                  w.index,
                  searchQuery,
                  {
                    imagesDir: opts.imagesDir,
                    count: stillShortBy,
                    verbose: !!opts.verbose,
                  }
                );
                if (searched.length) found = found.concat(searched);
              }
            }
          }

          if (!opts.dryRun && found.length > 0) {
            const first = found[0];
            const src = first.path;
            const namingText = imageText || w.back || w.front || String(w.index);
            const outName = buildFilename(
              w.index,
              namingText,
              path.extname(src) || ".jpg"
            );
            const dest = path.join(opts.mediaDir, outName);
            if (!fs.existsSync(dest)) await fsp.copyFile(src, dest);
            w.imgNames.push(outName);

            send({
              type: "log",
              level: "info",
              message: `[#${w.index}] image saved from ${first.source} → ${outName}`,
            });
          } else {
            send({
              type: "log",
              level: "warn",
              message: `[#${w.index}] no image produced`,
            });
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

    const media = new Set<string>();
    for (const w of part) {
      if (w.mp3Name) media.add(w.mp3Name);
      for (const img of w.imgNames) media.add(img);
    }
    for (const m of media) {
      const buf = await fsp.readFile(path.join(opts.mediaDir, m));
      deck.addMedia(m, buf);
    }

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
