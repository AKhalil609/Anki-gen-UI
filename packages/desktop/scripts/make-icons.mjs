import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(process.cwd());
const srcPng = path.join(root, "assets", "anki_logo.png"); // source logo
const buildDir = path.join(root, "build");
const iconsDir = path.join(buildDir, "icons");

// Sizes recommended for Linux/AppImage + extras
const pngSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generatePngs() {
  await ensureDir(iconsDir);
  const img = sharp(srcPng);
  for (const size of pngSizes) {
    const out = path.join(iconsDir, `icon_${size}.png`);
    await img
      .clone()
      .resize(size, size, { fit: "contain" })
      .png()
      .toFile(out);
  }
  // Convenient default icon.png (512)
  await img.clone().resize(512, 512, { fit: "contain" }).png().toFile(path.join(buildDir, "icon.png"));
  console.log(`[icons] Wrote PNGs in ${iconsDir} with sizes: ${pngSizes.join(", ")}`);
}

async function generateIco() {
  const toIco = (await import("to-ico")).default;
  const buffers = await Promise.all(
    [16, 24, 32, 48, 64, 128, 256].map((s) =>
      sharp(srcPng).resize(s, s, { fit: "contain" }).png().toBuffer()
    )
  );
  const ico = await toIco(buffers);
  await fs.writeFile(path.join(buildDir, "logo.ico"), ico);
  console.log(
    `[icons] Wrote ${path.join(buildDir, "logo.ico")} with sizes: 16,24,32,48,64,128,256`
  );
}

(async () => {
  await ensureDir(buildDir);
  await generatePngs();
  await generateIco().catch(() => {
    console.warn("[icons] Skipping ICO (install `to-ico` if you need it)");
  });
})();
