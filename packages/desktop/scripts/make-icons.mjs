// packages/desktop/scripts/make-icons.mjs
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCb);

const root = path.resolve(process.cwd());
const srcPng = path.join(root, "build", "logo.png"); // your existing artwork
const buildDir = path.join(root, "build");
const iconsetDir = path.join(buildDir, "AnkiOne.iconset");

// Apple icon sizes (1x/2x variants → up to 1024)
const macIconSizes = [16, 32, 64, 128, 256, 512, 1024];

function exists(p) {
  try { return fssync.existsSync(p); } catch { return false; }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateMacIcns() {
  if (!exists(srcPng)) {
    throw new Error(`Source logo not found: ${srcPng}`);
  }

  // Load image and remove transparent padding.
  // sharp@0.34 expects an object for trim options.
  let base = sharp(srcPng);
  try {
    base = base.trim({ threshold: 10 }); // preferred on your sharp version
  } catch {
    // Fallback to default trim() if the above isn’t supported for some reason
    base = sharp(srcPng).trim();
  }

  // Normalize to a 1024×1024 square (cover => fills the canvas, no big margins)
  const square = await base
    .resize(1024, 1024, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  await fs.rm(iconsetDir, { recursive: true, force: true });
  await ensureDir(iconsetDir);

  // Emit iconset with all sizes (1x and 2x)
  for (const size of macIconSizes) {
    for (const scale of [1, 2]) {
      const dim = size * scale;
      const filename = `icon_${size}x${size}${scale === 2 ? "@2x" : ""}.png`;
      const outPath = path.join(iconsetDir, filename);
      await sharp(square).resize(dim, dim).png().toFile(outPath);
    }
  }

  // Build .icns from iconset
  const icnsPath = path.join(buildDir, "logo.icns");
  await exec(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
  console.log(`[icons] Created ${icnsPath} (includes Retina sizes up to 1024×1024).`);
}

(async () => {
  await ensureDir(buildDir);
  await generateMacIcns();
})();
