#!/usr/bin/env node
// Repeint la pastille du 33 tours (le O de BROC) d'un aplat doré propre.
// Gemini y écrit du faux texte ; à 60 px c'est invisible, mais l'App Store
// affiche l'icône en 1024 et les micro-lettres illisibles s'y voient.
//
// ⚠ Les coordonnées ci-dessous valent pour le master 2048 généré le
// 2026-07-30 (icon-caps2). Toute nouvelle génération demande de les remesurer :
// scan des pixels dorés sur la ligne et la colonne du centre du disque.
//
// Usage : node scripts/retouch-icon-label.mjs <in.png> <out.png>

import sharp from "sharp";

const [, , IN, OUT] = process.argv;
if (!IN || !OUT) { console.error("usage: retouch-icon-label.mjs <in.png> <out.png>"); process.exit(1); }

const CX = 1255, CY = 986, R = 83;   // pastille dorée
const HOLE = 11;                      // trou central

const label = Buffer.from(`<svg width="2048" height="2048">
  <defs>
    <radialGradient id="or" cx="34%" cy="30%" r="78%">
      <stop offset="0%"   stop-color="#f4d99a"/>
      <stop offset="55%"  stop-color="#e0bd72"/>
      <stop offset="100%" stop-color="#a9853f"/>
    </radialGradient>
    <linearGradient id="lustre" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0%"   stop-color="#fff3cf" stop-opacity="0.55"/>
      <stop offset="45%"  stop-color="#fff3cf" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#or)"/>
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#lustre)"/>
  <circle cx="${CX}" cy="${CY}" r="${R - 1}" fill="none" stroke="#7d5f2b" stroke-opacity="0.45" stroke-width="2"/>
  <circle cx="${CX}" cy="${CY}" r="${HOLE}" fill="#100c08"/>
  <circle cx="${CX}" cy="${CY}" r="${HOLE}" fill="none" stroke="#8a6c34" stroke-opacity="0.5" stroke-width="1.5"/>
</svg>`);

await sharp(IN).composite([{ input: label, blend: "over" }]).png().toFile(OUT);
console.log("✅", OUT);
