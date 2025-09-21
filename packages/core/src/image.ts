import * as path from "node:path";
import { execa } from "execa";
import { ensureDir, buildFilename } from "./util.js";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";

async function exists(p: string) {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export type ImageFetchOpts = {
  pyPath?: string;             // python binary (default: "python3")
  scriptPath?: string;         // path to py/fetch_image.py
  imagesDir: string;           // base images dir
  count: number;               // images per sentence
  verbose?: boolean;           // show python logs
};

export async function fetchImagesForSentence(
  index: number,
  germanSentence: string,
  opts: ImageFetchOpts
): Promise<string[]> {
  const py = opts.pyPath || "python3";
  const script = opts.scriptPath || path.join(process.cwd(), "py", "fetch_image.py");
  await ensureDir(opts.imagesDir);

  // Folder per sentence for cleanliness:
  const folderSlug = buildFilename(index, germanSentence, ""); // no ext
  const outFolder = path.join(opts.imagesDir, folderSlug || "img");

  const args = [script, germanSentence, String(opts.count), outFolder];
  if (opts.verbose) args.push("--verbose");

  // Keep Python quiet unless verbose; if it fails, surface stderr
  try {
    const { stderr } = await execa(py, args, { stdio: opts.verbose ? "inherit" : "pipe" });
    if (!opts.verbose && stderr && stderr.trim()) {
      // non-fatal warnings get swallowed; that's fine
    }
  } catch (e: any) {
    const msg = e?.stderr?.toString?.() || e?.shortMessage || String(e);
    throw new Error(`Image fetch failed for #${index}: ${msg}`);
  }

  // icrawler names files like 000001.jpg etc. We’ll just pick the first one.
  const candidates = [
    path.join(outFolder, "000001.jpg"),
    path.join(outFolder, "000001.png"),
    path.join(outFolder, "000001.jpeg")
  ];

  const found: string[] = [];
  for (const c of candidates) {
    if (await exists(c)) {
      found.push(c);
      break;
    }
  }

  return found; // could return many if you set count>1
}
