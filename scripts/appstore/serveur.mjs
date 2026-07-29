/** Petit serveur statique pour servir l'export out/ à Playwright. */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

async function existe(chemin) {
  try {
    return await fs.stat(chemin);
  } catch {
    return null;
  }
}

async function resoudre(racine, urlPath) {
  const encoded = urlPath.split("?")[0];
  const decode = decodeURIComponent(encoded);
  const cible = path.resolve(racine, "." + decode);
  // Barrière anti-remontée : tout ce qui sort de la racine est refusé.
  if (cible !== racine && !cible.startsWith(racine + path.sep)) return null;

  const st = await existe(cible);
  if (st?.isDirectory()) {
    const index = path.join(cible, "index.html");
    if (await existe(index)) return index;
    // L'export statique de Next (Turbopack, App Router) écrit parfois
    // <route>.html en frère du dossier de payload RSC (<route>/*.txt) plutôt
    // qu'un index.html dedans : le dossier existe sans jamais contenir de
    // page. On retente donc le fichier .html au même niveau que le dossier.
    const soeur = cible + ".html";
    if (await existe(soeur)) return soeur;
    return null;
  }
  if (st) return cible;

  // Le dossier n'existe pas non plus : on tente le fichier .html correspondant.
  const alt = cible + ".html";
  if (await existe(alt)) return alt;
  return null;
}

/** Démarre le serveur sur un port libre et renvoie son URL. */
export async function demarrerServeur(dossier) {
  const racine = path.resolve(dossier);
  const serveur = http.createServer(async (req, res) => {
    try {
      const fichier = await resoudre(racine, req.url ?? "/");
      if (!fichier) {
        res.writeHead(404).end("Not found");
        return;
      }
      const type = MIME[path.extname(fichier).toLowerCase()] ?? "application/octet-stream";
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      res.end(await fs.readFile(fichier));
    } catch (err) {
      // Erreur fs inattendue (permissions, etc). Ne pas crasher le serveur.
      if (!res.headersSent) {
        res.writeHead(500).end("Internal Server Error");
      }
    }
  });
  await new Promise((ok) => serveur.listen(0, "127.0.0.1", ok));
  const { port } = serveur.address();
  return {
    url: `http://127.0.0.1:${port}`,
    fermer: () => new Promise((ok) => serveur.close(ok)),
  };
}
