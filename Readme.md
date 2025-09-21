# Anki One

**Anki One** is a toolchain for generating [Anki](https://apps.ankiweb.net/) decks (`.apkg`) from CSV files.  

It combines:

- **TTS (Text-to-Speech)** using [Microsoft Edge TTS](https://pypi.org/project/edge-tts/) to generate audio
- **Image search** via [icrawler](https://pypi.org/project/icrawler/) to attach images
- **Deck building** via [anki-apkg-export](https://www.npmjs.com/package/anki-apkg-export)
- A **desktop UI** (Electron + React + Material Web) for easy use
- A **Node.js core pipeline** for programmatic / CLI usage

---

## Project Structure

```
anki-one/
├── packages/
│   ├── core/         # Core library (pipeline, utils, image fetching, packaging)
│   └── desktop/      # Electron + React + Material Web UI
├── py/               # Python scripts for image fetching
└── .venv/            # Optional local Python virtualenv
```

---

## Features

- Import **CSV** files with front/back columns
- Generate **audio** for each back-side sentence
- Fetch **images** from Google for each sentence
- Export to `.apkg` with:
  - Front text
  - Back text
  - Audio (MP3, playable in Anki)
  - Image (JPEG/PNG/WebP/AVIF)
- Configurable options:
  - Voice (hundreds of locales/genders)
  - Images per note
  - Concurrency
  - SQL.js memory size
  - Image quality/size/format
  - Batch size for large decks
- Modern **Material Design 3** UI
- Works as:
  - **Electron app** with graphical interface
  - **Node.js library / CLI** for automation

---

## Requirements

### Node.js
- Node.js **18+**
- [pnpm](https://pnpm.io/) package manager

### Python
- Python **3.9+** (tested with Python 3.13)
- Installed packages:
  ```bash
  pip install icrawler edge-tts
  ```

### External Tools
- `edge-tts` (installed with the Python package)
- `python3` available in `PATH`

---

## Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/your-org/anki-one.git
cd anki-one
pnpm install
```

Build all packages:

```bash
pnpm build
```

---

## Usage

### Desktop App (Electron UI)

Start the desktop app in development:

```bash
pnpm --filter anki-one-desktop dev
```

This opens an **Electron window** with the Anki One UI.  

From here you can:

1. Pick a **CSV file** (with `Front` / `Back` columns).
2. Choose an **output `.apkg` path**.
3. Configure deck options (voice, images, memory, etc.).
4. Click **Build Deck**.

⚠️ In the browser preview (Vite dev server), the app runs in **preview mode** — deck building is disabled until run in Electron.

---

### Core Library (Node.js)

You can run the pipeline programmatically:

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
  },
  (event) => {
    console.log("Progress event:", event);
  }
);
```

---

## CSV Format

Your input CSV must include at least two columns:

- `Front (English sentence)` – text for the front of the card
- `Back (German sentence)` – text for the back (used for TTS + images)

Example:

```csv
Front (English sentence),Back (German sentence)
Hello,Hallo
Good morning,Guten Morgen
I like coffee,Ich mag Kaffee
```

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

Run tests:

```bash
pnpm test
```

---

## Python Image Fetcher

Images are fetched via:

```
packages/core/py/fetch_image.py <query> <count> <out_dir>
```

This script uses `icrawler` to fetch Google Images. Example:

```bash
python3 packages/core/py/fetch_image.py "dog" 5 ./media/images/dog
```

---

## Troubleshooting

- **Error: edge-tts not found**  
  → Ensure `pip install edge-tts` and `python3 -m edge_tts --help` works.

- **Error: Python lacks packages**  
  → Install `icrawler` and `edge-tts` into your active Python environment.

- **No rows in input CSV**  
  → Check your CSV encoding and column headers.

- **Build disabled in browser**  
  → Run in Electron via `pnpm --filter anki-one-desktop dev`.

---

## License

MIT © 2025 Your Name
