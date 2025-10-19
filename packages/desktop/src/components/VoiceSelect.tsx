import { useMemo, useState } from "react";
import { VOICES } from "../data/voices";
import { formatVoiceLabel } from "../utils/voice";
import type { Voice } from "../types";

/**
 * Searchable voice selector.
 * - Top text input filters by id or language label.
 * - Bottom <select> shows filtered results (scrollable).
 */
export default function VoiceSelect({
  value,
  onChange,
  locale = navigator.language || "en",
  maxHeight = 240,
}: {
  value: string;
  onChange: (id: string) => void;
  locale?: string;
  maxHeight?: number;
}) {
  const [query, setQuery] = useState("");

  // Ensure the current value stays selectable even if it's not in VOICES
  const voicesWithCustom: Voice[] = useMemo(() => {
    const found = VOICES.find((v) => v.id === value);
    return found ? VOICES : [{ id: value, gender: "Neutral" as const }, ...VOICES];
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return voicesWithCustom;
    return voicesWithCustom.filter((v) => {
      const id = v.id.toLowerCase();
      const label = formatVoiceLabel(v, locale).toLowerCase();
      return id.includes(q) || label.includes(q);
    });
  }, [query, voicesWithCustom, locale]);

  return (
    <div className="grid gap-2">
      <input
        type="text"
        className="input h-12"
        placeholder="Search voice… (e.g. de-DE, Katja, female)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="relative">
        <select
          className="input h-14"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          size={Math.min(8, Math.max(4, filtered.length))} // desktop: nice compact list
          style={{
            // turn the select into a scrollable list without making it huge
            height: "auto",
            maxHeight,
            overflowY: "auto",
          }}
        >
          {filtered.map((v) => {
            const label =
              v.id === value && !VOICES.find((x) => x.id === v.id)
                ? `Custom (${v.id})`
                : formatVoiceLabel(v, locale);
            return (
              <option key={v.id} value={v.id} title={v.id}>
                {label}
              </option>
            );
          })}
        </select>
        {/* Small helper text */}
        <div className="mt-1 text-xs text-[var(--muted)]">
          {filtered.length.toLocaleString()} voice{filtered.length === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}
