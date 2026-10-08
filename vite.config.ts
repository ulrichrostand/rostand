import { defineConfig } from "vitest/config";

export default defineConfig({
  // Chemins relatifs : le build fonctionne sur GitHub Pages (sous-dossier /<repo>/) comme en local.
  base: "./",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
