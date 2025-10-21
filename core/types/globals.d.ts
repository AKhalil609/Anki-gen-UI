export {};

declare global {
  // sql.js (via anki-apkg-export) checks global Module.* at import time
  // We only need it typed loosely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var Module: any;
}