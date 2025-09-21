import { createHash } from "node:crypto";
import { mkdir, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import * as path from "node:path";

/** Ensure a directory exists (mkdir -p) */
export async function ensureDir(dir: string) {
  try {
    await access(dir, fsConstants.F_OK);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

/** Slugify a sentence to a filesystem-friendly name (short, stable) */
export function slugifySentence(s: string, maxLen = 40): string {
  const cleaned = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const short = cleaned.slice(0, maxLen).replace(/-+$/g, "");
  return short || "media";
}

/** Stable short hash so filenames are unique even if sentences repeat */
export function shortHash(s: string): string {
  return createHash("sha1").update(s).digest("hex").slice(0, 8);
}

/** Build filename with index, slug, and hash to avoid collisions */
export function buildFilename(index: number, sentence: string, ext = ".mp3"): string {
  const slug = slugifySentence(sentence);
  const hash = shortHash(sentence);
  return `${String(index).padStart(3, "0")}-${slug}-${hash}${ext}`;
}

/** Join outDir + filename */
export function filePath(outDir: string, filename: string): string {
  return path.join(outDir, filename);
}
