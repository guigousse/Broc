import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export statique pour packaging Tauri (DMG hors-ligne).
  // Désactivable en dev en commentant `output: "export"` si besoin.
  output: "export",
  images: { unoptimized: true },
  /**
   * Origines autorisées à parler au serveur de DÉVELOPPEMENT. Sans elles,
   * Next 16 refuse la WebSocket de rechargement à chaud dès qu'on ouvre l'app
   * autrement que par `localhost` — et l'app reste alors figée sur
   * « ouverture du local… », coquille servie mais jamais hydratée. C'est la
   * cause du vieux piège « 127.0.0.1 ne marche pas ».
   *
   * Indispensable pour éprouver le jeu depuis un vrai téléphone sur le réseau
   * local. Sans effet en production : `next build` ignore ce champ.
   */
  allowedDevOrigins: ["127.0.0.1", "192.168.1.*", "10.0.*.*", "172.16.*.*"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
