import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/**/*.test.mjs",
      "tiktok-gen/**/*.test.mjs",
    ],
    exclude: ["node_modules/**", ".next/**", "out/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
