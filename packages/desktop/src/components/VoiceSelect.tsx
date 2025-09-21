import { useMemo } from "react";
import { VOICES } from "../data/voices";
import { formatVoiceLabel } from "../utils/voice";
import type { Voice } from "../types";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function VoiceSelect({ value, onChange }: Props) {
  const voicesWithCustom: Voice[] = useMemo(() => {
    const found = VOICES.find((v: Voice) => v.id === value);
    return found ? VOICES : [{ id: value, gender: "Neutral" }, ...VOICES];
  }, [value]);

  return (
    <select
      className="select select-bordered"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {voicesWithCustom.map((v) => (
        <option key={v.id} value={v.id}>
          {v.id === value && !VOICES.find((x) => x.id === v.id)
            ? `Custom (${v.id})`
            : formatVoiceLabel(v)}
        </option>
      ))}
    </select>
  );
}
