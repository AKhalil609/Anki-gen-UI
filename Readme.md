# Anki One

**Anki One** is a toolchain for generating [Anki](https://apps.ankiweb.net/) decks (`.apkg`) from CSV files.

It combines:

- **TTS (Text-to-Speech)** using Microsoft Edge TTS to generate audio
- **Image fetching** (search or generation) to attach images
- **Deck building** via [anki-apkg-export](https://www.npmjs.com/package/anki-apkg-export)
- A **desktop UI** (Electron + React + Material Web)
- A **Node.js core pipeline** for programmatic / CLI usage

---

## Project Structure

```
anki-one/
├── packages/
│   ├── core/         # Core library (pipeline, utils, image fetching, packaging)
│   └── desktop/      # Electron + React + Material Web UI
├── py/               # (Optional) Python helpers for image fetching
└── .venv/            # (Optional) local Python virtualenv
```

---

## Features

- Import **CSV** files with front/back columns
- Generate **audio** for each note using Edge TTS
- Fetch or generate **images** (configurable sources & styles)
- Export to `.apkg` with:
  - Front text
  - Back text
  - Audio (MP3)
  - Images (JPEG/PNG/WebP/AVIF)
- Configurable options:
  - Voice (hundreds of locales/genders)
  - Images per note
  - Concurrency
  - SQL.js memory size
  - Image quality/size/format
  - Batch size for large decks
  - Image mode: **search** or **generate**
- Modern **Material Design 3** UI with dark mode, subtle **transitions/animations**
- **Fail-fast** checks and better controls:
  - **Preflight CSV header check** (detects wrong column names before running)
  - **Cancel** current run
  - **Reset** UI state after errors or runs
  - **Open media folder** button in the top bar
- Works as:
  - **Electron app** (GUI)
  - **Node.js library / CLI** (automation)

---

## Requirements

### Node.js
- Node.js **18+**
- [pnpm](https://pnpm.io/) package manager

### Python (optional)
If you use the Python image helpers:
- Python **3.9+**
- Install packages:
  ```bash
  pip install icrawler edge-tts
  ```
- Ensure `python3` is in your `PATH`.

> The desktop app can fetch/generate images without Python. Python is **optional**.

---

## Install

```bash
git clone https://github.com/your-org/anki-one.git
cd anki-one
pnpm install
pnpm build
```

---

## Usage

### Desktop App (Electron UI)

**Dev mode:**
```bash
pnpm --filter anki-one-desktop dev
```

This opens an **Electron** window.

1) Pick a **CSV file**.  
2) Click **Build Deck** (if no output path is set, you’ll be prompted to choose it).  
3) Configure options (voice, columns, images, etc.).  
4) Watch progress; use **Stop** to cancel or **Reset** to clear.

> In a normal browser (Vite preview), deck building is disabled. Use Electron for full functionality.

**Production builds:**
```bash
# macOS .dmg
pnpm --filter anki-one-desktop dist:mac

# Windows .exe (NSIS)
pnpm --filter anki-one-desktop dist:win

# Linux AppImage
pnpm --filter anki-one-desktop dist:linux
```

On macOS Gatekeeper: if macOS warns about an unidentified developer, right-click the app → **Open** → confirm.

---

### Core Library (Node.js)

```ts
import { runPipeline } from "@anki-one/core";

const { outputs, durationMs } = await runPipeline(
  {
    input: "./sentences.csv",
    deckName: "My Deck",
    apkgOut: "./output.apkg",
    mediaDir: "./media",
    imagesDir: "./media/images",
    voice: "de-DE-KatjaNeural",
    imagesPerNote: 1,
    concurrency: 2,
    colFront: "Front (English sentence)",
    colBack: "Back (German sentence)",
    sqlMemoryMB: 512,
    useDownsample: true,
    imgMaxWidth: 480,
    imgMaxHeight: 480,
    imgFormat: "webp",
    imgQuality: 80,
    imgStripMeta: true,
    imgNoEnlarge: true,
    batchSize: 1000000,

    // image config (optional)
    imageMode: "search",   // or "generate"
    genProvider: "pollinations",
    genStyle: "anime",
    useImageCache: true,
  },
  (event) => {
    console.log("Progress event:", event);
  }
);
```

---

## CSV Format

Your CSV must include at least two columns (defaults used by the app):

- `Front (English sentence)` – the front of the card  
- `Back (German sentence)` – the back (used for TTS + images)

Example:

```csv
Front (English sentence),Back (German sentence)
Hello,Hallo
Good morning,Guten Morgen
I like coffee,Ich mag Kaffee
```

You can rename these in **Settings → CSV Columns**.

---

## UI Notes

- **Build** enables after you select a **CSV** in Electron. If output isn’t set, the app will **prompt for an output file** on click.
- **Cancel** cleanly terminates the run.
- **Reset** clears progress state and lets you start fresh.
- **Open media folder** (top bar button) opens the folder that contains generated audio/images for the chosen output path.

---

## Troubleshooting

### “Build” button is disabled
- You’re likely in a **web browser preview**. Use Electron:
  ```bash
  pnpm --filter anki-one-desktop dev
  ```
- Or you haven’t selected a **CSV** yet.
- If the button still appears disabled, ensure you’re not currently **running** a job.

### Wrong CSV column names
- The app **preflights** your CSV and will show a clear error if required columns are missing.
- Set the correct names in **Settings → CSV Columns** (defaults are above).

### Stuck “loading” or long runs
- Use **Stop** to cancel the run.  
- Use **Reset** to clear the UI after errors.

### Packaging: “Cannot find module ‘csv-parse/sync’”
- The main process no longer depends on that package. Rebuild:
  ```bash
  pnpm -F anki-one-desktop build
  pnpm -F anki-one-desktop dist:mac
  ```
- Ensure `electron/dist/**` and `dist/**` are included by electron-builder (already configured in `package.json`).

### Python-related issues
- Only needed if you use the optional Python helpers.  
- Make sure `python3` is in `PATH` and `icrawler` / `edge-tts` are installed.

---

## Development

### Desktop
```bash
cd packages/desktop
pnpm dev
```

### Core
```bash
cd packages/core
pnpm build
```

Run tests (if present):
```bash
pnpm test
```

---

## Roadmap / Ideas

- More image providers & styles
- Per-note overrides
- Batch reports and analytics
- Drag-drop CSVs
- Presets for popular deck formats
