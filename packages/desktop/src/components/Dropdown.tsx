import { useEffect, useMemo, useRef, useState } from "react";

type Option = { value: string; label: string };
type DropDirection = "auto" | "up" | "down";

export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
  dropDirection = "auto",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  dropDirection?: DropDirection;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [computedUp, setComputedUp] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  );

  // Close on outside click / escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto compute up/down when opening
  useEffect(() => {
    if (!open) return;
    if (dropDirection !== "auto") {
      setComputedUp(dropDirection === "up");
      return;
    }
    const btnRect = btnRef.current?.getBoundingClientRect();
    const viewportH = window.innerHeight;
    // Assume menu up to ~240px tall (max-h-60)
    const willOverflow = (btnRect?.bottom ?? 0) + 240 > viewportH - 8;
    setComputedUp(willOverflow);
  }, [open, dropDirection]);

  const positionCls = computedUp
    ? "bottom-full mb-2 origin-bottom"
    : "top-full mt-2 origin-top";

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`input flex items-center justify-between cursor-pointer ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-white/5"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${selected ? "" : "opacity-70"}`}>
          {selected?.label ?? placeholder}
        </span>
        <span className="material-symbols-outlined ml-3 text-base opacity-80 select-none">
          expand_more
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`absolute left-0 z-50 w-full card border border-white/10 shadow-xl ${positionCls}`}
          role="listbox"
        >
          <div className="max-h-60 overflow-auto py-1">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md cursor-pointer
                    ${active ? "bg-[var(--primary)]/15" : "hover:bg-white/5"}`}
                  role="option"
                  aria-selected={active}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
