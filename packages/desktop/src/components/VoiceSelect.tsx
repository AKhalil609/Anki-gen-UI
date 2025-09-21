import { useMemo, useState } from "react";
import { VOICES } from "../data/voices";
import { formatVoiceLabel } from "../utils/voice";
import type { Voice } from "../types";

// Material Web components
import "@material/web/textfield/filled-text-field";
import "@material/web/select/filled-select";
import "@material/web/select/select-option";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function VoiceSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState("");

  // Include custom current value if it isn't in the list
  const voicesWithCustom: Voice[] = useMemo(() => {
    const found = VOICES.find((v: Voice) => v.id === value);
    return found ? VOICES : [{ id: value, gender: "Neutral" }, ...VOICES];
  }, [value]);

  // Filter by id or formatted label
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return voicesWithCustom;
    return voicesWithCustom.filter(
      (v) =>
        v.id.toLowerCase().includes(q) ||
        formatVoiceLabel(v).toLowerCase().includes(q)
    );
  }, [query, voicesWithCustom]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {/* Search input */}
      <md-filled-text-field
        label="Search voice…"
        value={query}
        onInput={(e: React.FormEvent<HTMLInputElement>) => setQuery((e.target as HTMLInputElement).value)}
        style={{ width: "100%" }}
      ></md-filled-text-field>

      {/* Material Select */}
      <md-filled-select
        label="Voice"
        // md-select sets .value on host; read it from the event target
        value={value}
        onInput={(e: React.FormEvent<HTMLSelectElement>) => {
          const v = (e.target as unknown as { value?: string }).value ?? "";
          onChange(v);
        }}
        style={{ width: "100%" }}
      >
        {filtered.map((v) => {
          const label =
            v.id === value && !VOICES.find((x) => x.id === v.id)
              ? `Custom (${v.id})`
              : formatVoiceLabel(v);
          return (
            <md-select-option key={v.id} value={v.id}>
              <div slot="headline">{label}</div>
            </md-select-option>
          );
        })}
      </md-filled-select>
    </div>
  );
}
