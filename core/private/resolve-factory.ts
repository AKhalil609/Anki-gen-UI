import { createRequire } from "node:module";
const requireCjs = createRequire(import.meta.url);

// ---- types ----
export type DeckInstance = {
  addMedia(name: string, data: Buffer | Uint8Array | ArrayBuffer): void;
  addCard(front: string, back: string): void;
  save(): Promise<Uint8Array | Buffer | string>;
};
export type DeckFactory = (name: string) => DeckInstance;

// ---- helpers ----
function purgeRequireCache(request: string) {
  try {
    const id = requireCjs.resolve(request);
    const visited = new Set<string>();
    (function drop(modId: string) {
      if (visited.has(modId)) return;
      visited.add(modId);
      const m = requireCjs.cache[modId as unknown as number | string] as any;
      if (!m) return;
      if (Array.isArray(m.children)) {
        for (const ch of m.children) {
          if (ch && ch.id) drop(ch.id);
        }
      }
      delete requireCjs.cache[modId as unknown as number | string];
    })(id);
  } catch {
    // ignore if not resolvable
  }
}

function locateSqlWasmPaths() {
  const initPath = requireCjs.resolve("sql.js/dist/sql-wasm.js");
  const wasmPath = requireCjs.resolve("sql.js/dist/sql-wasm.wasm");
  return { initPath, wasmPath };
}

/** Initialize sql.js WASM with a fixed Memory so we control heap size. */
async function initSqlJsWasm(sqlMemoryMB: number, verbose = false) {
  purgeRequireCache("sql.js");
  purgeRequireCache("sql.js/js/sql.js");
  purgeRequireCache("sql.js/dist/sql-wasm.js");

  const { initPath, wasmPath } = locateSqlWasmPaths();

  // sql.js publishes an init function as default (ESM) or module (CJS)
  const mod: any = await import(initPath);
  const initSqlJs: any = mod?.default ?? mod;
  if (typeof initSqlJs !== "function") {
    throw new Error("sql.js/dist/sql-wasm.js did not export an init function.");
  }

  // wasm page = 64 KiB
  const pages = Math.max(256, Math.ceil((Math.max(32, sqlMemoryMB) * 1024 * 1024) / 65536));
  const wasmMemory = new WebAssembly.Memory({ initial: pages, maximum: pages });

  const SQL = await initSqlJs({
    locateFile: (file: string) => (file.endsWith(".wasm") ? wasmPath : requireCjs.resolve("sql.js/dist/" + file)),
    wasmMemory,
  });

  if (verbose) {
    const mb = Math.round((pages * 65536) / (1024 * 1024));
    console.log(`[pack-preflight] sql.js WASM primed with ~${mb} MB heap.`);
  }
  return SQL;
}

/**
 * Install a require hook so any require/import of "sql.js" (including deep paths)
 * returns our pre-initialized SQL object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function installSqlRequireHook(SQL: any) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ModuleAny = requireCjs("module") as any;
  const origLoad = ModuleAny._load as (request: string, parent: any, isMain: boolean) => unknown;

  if ((installSqlRequireHook as any)._installed) return;
  (installSqlRequireHook as any)._installed = true;

  ModuleAny._load = function patchedLoad(request: string, parent: unknown, isMain: boolean) {
    const req = String(request);
    if (
      req === "sql.js" ||
      req === "sql.js/js/sql.js" ||
      req === "sql.js/dist/sql-wasm.js" ||
      /(^|\/)sql\.js(\/|$)/.test(req)
    ) {
      return SQL;
    }
    // eslint-disable-next-line prefer-rest-params
    return origLoad.apply(this, arguments as unknown as [string, unknown, boolean]);
  };
}

function isConstructable(fn: unknown): fn is new (...args: any[]) => any {
  return typeof fn === "function" && !!(fn as any).prototype && !!(fn as any).prototype.constructor;
}

// ---- public API ----
export async function resolveAnkiFactory(sqlMemoryMB: number, verbose = false): Promise<DeckFactory> {
  // 1) Init WASM sql.js
  const SQL = await initSqlJsWasm(sqlMemoryMB, verbose);

  // 2) Hook loader for any future sql.js loads
  installSqlRequireHook(SQL);

  // 3) Load anki-apkg-export (CJS first, then ESM)
  let cand: any;
  try {
    const cjs: any = requireCjs("anki-apkg-export");
    cand = cjs?.default ?? cjs;
  } catch {
    try {
      const esm: any = await import("anki-apkg-export");
      cand = esm?.default ?? esm;
    } catch (e: any) {
      throw new Error(`Cannot load anki-apkg-export: ${e?.message || e}`);
    }
  }

  // The library historically exported a class, sometimes nested as { AnkiExport }
  if (cand && typeof cand === "object") {
    cand = cand.AnkiExport ?? cand.default ?? cand;
  }
  if (!cand) throw new Error("anki-apkg-export export not found.");

  const factory: DeckFactory =
    isConstructable(cand)
      ? (name) => new cand(name)
      : typeof cand === "function"
        ? (name) => cand(name)
        : cand.create && typeof cand.create === "function"
          ? (name) => cand.create(name)
          : (() => {
              throw new Error("anki-apkg-export export is neither constructor nor function.");
            })();

  // Smoke test
  const smoke = factory("smoke");
  if (!smoke || typeof smoke.addCard !== "function" || typeof smoke.save !== "function") {
    throw new Error("anki-apkg-export smoke instance invalid.");
  }
  await smoke.save();

  if (verbose) {
    console.log(`[pack-preflight] anki-apkg-export OK (hooked to WASM sql.js).`);
  }

  return factory;
}

export default resolveAnkiFactory;