// /packages/desktop/src/MaterialDemo.tsx
import { useEffect, useRef } from "react";

// Import just the components you use
import "@material/web/button/filled-button";
import "@material/web/textfield/filled-text-field";

export default function MaterialDemo() {
  // Example: read value from the web component
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // No-op – just showing that it renders; events work like normal DOM events
  }, []);

  return (
    <div style={{ padding: 12, border: "1px dashed var(--md-sys-color-outline, #9994)", borderRadius: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Material Web — Smoke Test</div>

      {/* Material Filled Text Field */}
      <md-filled-text-field
        ref={inputRef as any}
        label="Deck name"
        value="My Deck"
        style={{ marginRight: 12, maxWidth: 280 }}
      ></md-filled-text-field>

      {/* Material Filled Button */}
      <md-filled-button
        onClick={() => {
          const host = inputRef.current as unknown as HTMLElement & { value?: string };
          alert(`Material is working! Input value: ${host?.getAttribute("value") || "My Deck"}`);
        }}
      >
        <span className="material-symbols-rounded" style={{ verticalAlign: "-4px", marginRight: 6 }}>check</span>
        Test
      </md-filled-button>
    </div>
  );
}
