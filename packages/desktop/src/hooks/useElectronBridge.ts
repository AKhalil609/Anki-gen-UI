import { useMemo, useEffect } from "react";
import type { ProgressEvent } from "../types";

export function useElectronBridge(onEvent?: (e: ProgressEvent) => void) {
  const isElectron = useMemo(() => typeof window !== "undefined" && !!window.anki, []);

  useEffect(() => {
    if (!isElectron || !window.anki?.onEvent || !onEvent) return;
    window.anki.onEvent(onEvent);
  }, [isElectron, onEvent]);

  const chooseFile = async () => (isElectron ? window.anki!.chooseFile() : null);
  const chooseOut = async () => (isElectron ? window.anki!.chooseOut() : null);
  const run = (opts: any) => {
    if (!isElectron) return;
    window.anki!.run(opts);
  };

  return { isElectron, chooseFile, chooseOut, run };
}