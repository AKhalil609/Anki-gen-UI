import * as path from "node:path";
import * as fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { fetch } from "undici";
import { ensureDir, buildFilename } from "./util.js";

async function fileExists(p: string) {
  try {
    await fs.access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export type ImageResult = { path: string; source: string };

export type GenOptions = {
  imagesDir: string;
  count: number;
  style?: string;        // e.g. "anime", "comic", "photorealistic"
  width?: number;        // default 768
  height?: number;       // default 512
  verbose?: boolean;
  timeoutMs?: number;    // per request timeout (default 20000)
  retries?: number;      // request-level retries per image (default 2)
  polls?: number;        // how many polls for warmup (default 4)
  pollDelayMs?: number;  // initial delay between polls (default 750)
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Pollinations sometimes returns a tiny placeholder while warming up.
 * We poll the same URL with backoff until we get a "real" image.
 */
export async function generateImagesPollinations(
  index: number,
  prompt: string,
  opts: GenOptions
): Promise<ImageResult[]> {
  const {
    imagesDir,
    count,
    style = "",
    width = 768,
    height = 512,
    verbose = false,
    timeoutMs = 20000,
    retries = 2,
    polls = 4,
    pollDelayMs = 750,
  } = opts;

  await ensureDir(imagesDir);
  const folderSlug = buildFilename(index, prompt, ""); // no ext
  const outFolder = path.join(imagesDir, folderSlug || "img");
  await ensureDir(outFolder);

  const saved: string[] = [];
  const basePrompt = style ? `${prompt} — style: ${style}` : prompt;

  // Stable-ish seed per note so different notes differ, and repeated builds are steady.
  const seed = String(index);
  const buildUrl = (p: string) => {
    const q = encodeURIComponent(p);
    return `https://image.pollinations.ai/prompt/${q}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
  };

  const fetchOnce = async (url: string, signal: AbortSignal) => {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: signal as any,
      headers: {
        "User-Agent": "anki-one/1.0 (+https://example.com)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ok = buf.length >= 20_000; // reject tiny placeholders
    const type = res.headers.get("content-type") || "";
    return { buf, ok, type, size: buf.length };
  };

  const tryToSave = async (p: string, seq: number) => {
    const url = buildUrl(p);
    let attempt = 0;

    while (attempt <= retries) {
      attempt++;
      if (verbose) console.log(`[gen] GET (attempt ${attempt}/${retries + 1}): ${url}`);
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort("timeout"), timeoutMs);
      try {
        // First fetch
        let { buf, ok, type, size } = await fetchOnce(url, controller.signal);

        // Poll if it's still the small/warmup image
        let poll = 0;
        let delay = pollDelayMs;
        while (!ok && poll < polls) {
          if (verbose) console.log(`[gen] warmup (size=${size}B, type=${type}). Poll ${poll + 1}/${polls} after ${delay}ms`);
          await sleep(delay);
          delay = Math.min(3000, Math.floor(delay * 1.6));
          ({ buf, ok, type, size } = await fetchOnce(url, controller.signal));
        }

        if (!ok) {
          throw new Error(`image too small after polling (size=${size}B, type=${type})`);
        }

        const outPath = path.join(outFolder, `${String(seq).padStart(6, "0")}.webp`);
        await fs.writeFile(outPath, buf);
        if (verbose) console.log(`[gen] saved ${outPath} (${buf.length} bytes, type=${type})`);
        return outPath;
      } catch (e) {
        if (attempt > retries) throw e;
        if (verbose) console.warn(`[gen] retry due to: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        clearTimeout(t);
      }
    }
    return null;
  };

  for (let i = 0, seq = 1; i < count; i++) {
    try {
      const out = await tryToSave(basePrompt, seq);
      if (out && (await fileExists(out))) {
        saved.push(out);
        seq++;
      }
    } catch (e) {
      if (verbose) console.warn(`[gen] generation failed permanently: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (verbose) {
    if (saved.length === 0) console.warn(`[gen] no images generated for prompt="${basePrompt}"`);
    else console.log(`[gen] generated ${saved.length}/${count} for "${basePrompt}"`);
  }
  return saved.map((p) => ({ path: p, source: "pollinations" }));
}
