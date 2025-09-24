// packages/desktop/scripts/embed-core.mjs
import { rm, mkdir, cp, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const desktop = resolve(__dirname, "..");
const coreSrc = resolve(desktop, "../core/dist");
const coreDst = resolve(desktop, "node_modules/@anki-one/core");

// Read core version from its package.json without JSON import assertions
const corePkgJson = require("../../core/package.json");
const coreVersion = corePkgJson?.version ?? "0.0.0";

await rm(coreDst, { recursive: true, force: true });
await mkdir(coreDst, { recursive: true });
await cp(coreSrc, resolve(coreDst, "dist"), { recursive: true });

// Minimal package.json so import("@anki-one/core") resolves in production
const corePkg = {
  name: "@anki-one/core",
  version: coreVersion,
  type: "module",
  main: "dist/index.js"
};
await writeFile(resolve(coreDst, "package.json"), JSON.stringify(corePkg, null, 2));

console.log("[embed-core] Copied core/dist into desktop node_modules (version", coreVersion + ").");
