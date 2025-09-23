// packages/core/src/tts.ts (ESM)
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Communicate, NoAudioReceived } from "edge-tts-universal";

/**
 * Synthesize `text` with Edge TTS and write MP3 to `outFile`.
 * Accepts same rate/pitch strings you already use (e.g., "+10%", "-2st"→ use Hz with universal API).
 */
export async function synthesizeToFile(opts: {
  text: string;
  voice: string;          // e.g. "de-DE-KatjaNeural"
  rate?: string;          // e.g. "+10%"
  pitch?: string;         // e.g. "+2Hz"
  volume?: string;        // optional, e.g. "+0%"
  outFile: string;
  verbose?: boolean;
}) {
  const { text, voice, rate, pitch, volume, outFile, verbose } = opts;

  await fs.mkdir(path.dirname(outFile), { recursive: true });

  const communicate = new Communicate(text, {
    voice,
    rate,
    pitch,
    volume,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of communicate.stream()) {
    if (chunk.type === "audio" && chunk.data) {
      chunks.push(chunk.data);
    } else if (verbose && chunk.type === "WordBoundary") {
      // could log timing if desired
    }
  }

  if (chunks.length === 0) {
    throw new NoAudioReceived("No audio chunks received from edge-tts-universal");
  }

  await fs.writeFile(outFile, Buffer.concat(chunks));
}
