import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export statique pour packaging Tauri (DMG hors-ligne).
  // Désactivable en dev en commentant `output: "export"` si besoin.
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
