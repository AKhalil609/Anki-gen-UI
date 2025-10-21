import { useEffect, useMemo, useRef, useState } from "react";
import { VOICES } from "../data/voices";
import { formatVoiceLabel } from "../utils/voice";
import type { Voice } from "../types";

type Props = {
  /** currently selected voice id (e.g. "de-DE-KatjaNeural") */
  value: string;
  onChange: (id: string) => void;
  /** optional: override list; defaults to VOICES */
  voices?: Voice[];
  /** optional: max menu height in px */
  maxMenuHeight?: number;
};

export default function VoiceDropdown({
  value,
  onChange,
  voices = VOICES,
  maxMenuHeight = 280,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Ensure current value is available even if it's not in the static list
  const allVoices: Voice[] = useMemo(() => {
    const found = voices.some((v) => v.id === value);
    return found ? voices : [{ id: value, gender: "Neutral" } as Voice, ...voices];
  }, [voices, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allVoices;
    return allVoices.filter((v) => {
      const id = v.id.toLowerCase();
      const label = formatVoiceLabel(v).toLowerCase();
      return id.includes(q) || label.includes(q);
    });
  }, [query, allVoices]);

  const selectedLabel = useMemo(() => {
    const v = allVoices.find((x) => x.id === value);
    return v ? formatVoiceLabel(v) : value;
  }, [allVoices, value]);

  // open -> focus search
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
      setActiveIndex(0);
    }
  }, [open, query]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node | null;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  // Keyboard nav when menu is open
  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const v = filtered[activeIndex];
      if (v) {
        onChange(v.id);
        setOpen(false);
        btnRef.current?.focus();
      }
    }
  };

  return (
    <div className="relative inline-block w-full">
      {/* Trigger button */}
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input h-12 flex items-center justify-between cursor-pointer"
        onClick={() => setOpen((o) => !o)}
        title={selectedLabel}
      >
        <span className="truncate">{selectedLabel || "Select voice"}</span>
        <span className="material-symbols-outlined ml-2">expand_more</span>
      </button>

      {/* Menu */}
      {open && (
        <div
          ref={menuRef}
          className="absolute z-50 mt-2 w-full rounded-lg card shadow-soft ring-1 ring-black/10"
          role="listbox"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
        >
          {/* Search input */}
          <div className="p-2">
            <input
              ref={searchRef}
              className="input h-10"
              placeholder="Search voices…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search voices"
            />
          </div>

          {/* Options list */}
          <div
            className="pb-2 overflow-y-auto"
            style={{ maxHeight: maxMenuHeight }}
          >
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-[var(--muted)]">No results</div>
            )}

            {filtered.map((v, i) => {
              const id = v.id;
              const label =
                id === value && !voices.find((x) => x.id === id)
                  ? `Custom (${id})`
                  : formatVoiceLabel(v);
              const isActive = i === activeIndex;
              const isSelected = id === value;

              return (
                <button
                  type="button"
                  key={id}
                  role="option"
                  aria-selected={isSelected}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md cursor-pointer ${
                    isActive ? "bg-white/10" : "hover:bg-white/5"
                  } ${isSelected ? "font-semibold" : ""}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                    btnRef.current?.focus();
                  }}
                  title={label}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
