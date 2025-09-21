import type { Voice } from "../types";

export function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Format like "French (Female–DeniseNeural)" from id "fr-FR-DeniseNeural" */
export function formatVoiceLabel(v: Voice, locale = navigator.language || "en") {
  const [langCode] = v.id.split("-");
  const langName =
    (Intl as any).DisplayNames
      ? new Intl.DisplayNames([locale], { type: "language" }).of(langCode)
      : langCode;
  const name = v.id.substring(v.id.lastIndexOf("-") + 1);
  return `${capitalize(langName)} (${v.gender}–${name})`;
}