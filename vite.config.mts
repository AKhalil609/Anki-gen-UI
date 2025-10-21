import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "./",
  build: {
    outDir: "renderer",
    emptyOutDir: true,
  },
  plugins: [react(), tsconfigPaths()],
  optimizeDeps: {
    include: [
      "@material/web/button/filled-button",
      "@material/web/textfield/filled-text-field",
    ],
  },
});
