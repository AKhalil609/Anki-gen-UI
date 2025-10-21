export type ProgressEvent =
  | { type: "preflight"; message: string }
  | {
      type: "progress";
      queued: number;
      running: number;
      done: number;
      failed: number;
      retries: number;
    }
  | { type: "log"; level: "info" | "warn" | "error"; message: string }
  | { type: "pack:start"; total: number; parts: number; batchSize: number }
  | { type: "pack:part"; partIndex: number; parts: number; filename: string }
  | { type: "pack:done"; outputs: string[]; durationMs: number }
  | { type: "done"; code: number };

export type Voice = {
  id: string;
  label?: string;
  name?: string;
  locale?: string;
  gender?: "Male" | "Female" | "Neutral";
  note?: string;
  sampleText?: string;
};

declare global {
  interface Window {
    anki: {
      chooseFile(): Promise<string | null>;
      chooseOut(): Promise<string | null>;
      run(opts: any): void;
      onEvent(cb: (e: ProgressEvent) => void): void;
      openPath?(path: string): Promise<{ ok: boolean; error?: string }>;
      cancel?(): void;
    };
  }
}
