import { useMemo, useEffect } from "react";
import type { ProgressEvent } from "../types";

export function useElectronBridge(onEvent?: (e: ProgressEvent) => void) {
  const isElectron = useMemo(
    () => typeof window !== "undefined" && !!window.anki,
    []
  );

  useEffect(() => {
    if (!isElectron || !window.anki?.onEvent || !onEvent) return;
    const off = window.anki.onEvent(onEvent) as (() => void) | undefined;
    return () => {
      try { off?.(); } catch {}
    };
  }, [isElectron, onEvent]);

  const chooseFile = async () => (isElectron ? window.anki!.chooseFile() : null);
  const chooseOut = async () => (isElectron ? window.anki!.chooseOut() : null);
  const run = (opts: any) => { if (isElectron) window.anki!.run(opts); };
  const cancel = () => { if (isElectron && window.anki?.cancel) window.anki.cancel(); };

  return { isElectron, chooseFile, chooseOut, run, cancel };
}
