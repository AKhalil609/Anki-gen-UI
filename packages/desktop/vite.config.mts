import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  optimizeDeps: {
    include: [
      "@material/web/button/filled-button",
      "@material/web/textfield/filled-text-field",
    ],
  },
});
