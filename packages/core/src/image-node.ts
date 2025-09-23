// packages/core/src/image-node.ts
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { fetch } from "undici";
import { fileTypeFromBuffer } from "file-type";
import { ensureDir, buildFilename } from "./util.js";
import gis from "g-i-s";

export type ImageFetchOptions = {
  imagesDir: string;
  count: number;
  verbose?: boolean;
  maxPerProvider?: number; // default 12
  minBytes?: number;       // default 4096
  allowExt?: Array<"jpg" | "jpeg" | "png" | "webp" | "gif">; // default jpg/png/webp
};

async function fileExists(p: string) {
  try { await fs.access(p, fsConstants.F_OK); return true; } catch { return false; }
}

function pickRefererFor(urlStr: string): string | undefined {
  try {
    const u = new URL(urlStr);
    return `${u.protocol}//${u.host}/`;
  } catch {
    return undefined;
  }
}

async function tryDownload(url: string, outPathNoExt: string, opts: Required<Pick<ImageFetchOptions, "verbose"|"minBytes"|"allowExt">>) {
  const referer = pickRefererFor(url);
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  };
  if (referer) headers["Referer"] = referer;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort("timeout"), 15000);

  let res;
  try {
    res = await fetch(url, { redirect: "follow", headers, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < opts.minBytes) throw new Error(`Too small (${buf.length}B)`);

  const kind = await fileTypeFromBuffer(buf);
  const ext = (kind?.ext ?? "jpg").toLowerCase();

  const allowed = new Set(opts.allowExt);
  if (!allowed.has(ext as any)) throw new Error(`Unsupported ext: ${ext}`);

  const outPath = `${outPathNoExt}.${ext}`;
  await fs.writeFile(outPath, buf);
  if (opts.verbose) console.log(`[image] saved ${outPath} (${buf.length} bytes)`);
  return outPath;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/* ---------------- Wikimedia / Wikipedia (no key) ---------------- */

async function wikiLeadImage(query: string, verbose?: boolean): Promise<string[]> {
  // 1) Try German Wikipedia pageimage original
  const deUrl = `https://de.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&titles=${encodeURIComponent(query)}`;
  try {
    const r = await fetch(deUrl);
    const j: any = await r.json();
    const pages = j?.query?.pages || {};
    for (const k of Object.keys(pages)) {
      const orig = pages[k]?.original?.source;
      if (orig && typeof orig === "string") {
        if (verbose) console.log(`[image] dewiki pageimage: ${orig}`);
        return [orig];
      }
    }
  } catch (e: any) {
    if (verbose) console.warn(`[image] dewiki pageimage error: ${e?.message || e}`);
  }

  // 2) Search Commons and get direct image URLs via imageinfo
  try {
    // search first
    const searchUrl =
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=10&prop=imageinfo&iiprop=url`;
    const r = await fetch(searchUrl);
    const j: any = await r.json();
    const pages = j?.query?.pages || {};
    const urls: string[] = [];
    for (const k of Object.keys(pages)) {
      const info = pages[k]?.imageinfo;
      if (Array.isArray(info) && info[0]?.url) {
        urls.push(info[0].url as string);
      }
    }
    if (verbose) console.log(`[image] commons search urls: ${urls.length}`);
    return urls;
  } catch (e: any) {
    if (verbose) console.warn(`[image] commons search error: ${e?.message || e}`);
  }

  return [];
}

/* ---------------- Openverse (no key) ---------------- */

async function openverseUrls(query: string, limit: number, verbose?: boolean): Promise<string[]> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${Math.max(1, Math.min(limit, 20))}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "anki-one/1.0 (+https://example.com)" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j: any = await r.json();
    const results: any[] = j?.results || [];
    const urls = results.map(x => x?.url).filter((u: string) => typeof u === "string" && u.startsWith("http"));
    if (verbose) console.log(`[image] openverse found ${urls.length} urls`);
    return urls.slice(0, limit);
  } catch (e: any) {
    if (verbose) console.warn(`[image] openverse error: ${e?.message || e}`);
    return [];
  }
}

/* ---------------- g-i-s (no key) as backup ---------------- */

async function gisUrls(query: string, limit: number, verbose?: boolean): Promise<string[]> {
  try {
    const results: any[] = await new Promise((resolve, reject) => {
      gis(query, (err: any, images: any[]) => (err ? reject(err) : resolve(images || [])));
    });
    const urls = results
      .map((r) => r?.url)
      .filter((u: string) => typeof u === "string" && u.startsWith("http"));
    if (verbose) console.log(`[image] g-i-s found ${urls.length} urls`);
    return urls.slice(0, limit);
  } catch (e: any) {
    if (verbose) console.warn(`[image] g-i-s error: ${e?.message || e}`);
    return [];
  }
}

/* ---------------- Main fetch ---------------- */

export async function fetchImagesNode(
  index: number,
  query: string,
  opts: ImageFetchOptions
): Promise<string[]> {
  const {
    imagesDir,
    count,
    verbose,
    maxPerProvider = 12,
    minBytes = 4096,
    allowExt = ["jpg", "jpeg", "png", "webp"],
  } = opts;

  await ensureDir(imagesDir);
  const folderSlug = buildFilename(index, query, ""); // no ext
  const outFolder = path.join(imagesDir, folderSlug || "img");
  await ensureDir(outFolder);

  let candidates: string[] = [];

  // Provider 1: Wikimedia / Wikipedia
  try {
    const wiki = await wikiLeadImage(query, verbose);
    candidates = unique(candidates.concat(wiki));
  } catch (e: any) {
    if (verbose) console.warn(`[image] wiki error: ${e?.message || e}`);
  }

  // Provider 2: Openverse
  if (candidates.length < Math.max(count, 3)) {
    const ov = await openverseUrls(query, maxPerProvider, verbose);
    candidates = unique(candidates.concat(ov));
  }

  // Provider 3: g-i-s backup
  if (candidates.length < Math.max(count, 3)) {
    const g = await gisUrls(query, maxPerProvider, verbose);
    candidates = unique(candidates.concat(g));
  }

  if (verbose) console.log(`[image] total candidates: ${candidates.length}`);

  const saved: string[] = [];
  for (let i = 0, seq = 1; i < candidates.length && saved.length < count; i++) {
    const url = candidates[i];
    const base = path.join(outFolder, String(seq).padStart(6, "0"));
    try {
      const filePath = await tryDownload(url, base, { verbose: !!verbose, minBytes, allowExt });
      if (await fileExists(filePath)) {
        saved.push(filePath);
        seq++;
      }
    } catch (e: any) {
      if (verbose) console.warn(`[image] skip ${url}: ${e?.message || e}`);
    }
  }

  if (verbose) {
    if (saved.length === 0) console.warn(`[image] no images saved for query="${query}"`);
    else console.log(`[image] saved ${saved.length}/${count} for "${query}"`);
  }

  return saved;
}
