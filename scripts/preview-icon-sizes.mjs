// Planche de comparaison : chaque candidat masqué au squircle iOS,
// affiché en grand (400) et à la taille réelle de l'écran d'accueil (60, agrandi ×4).
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const DIR = process.env.PLANCHE_DIR;
const files = process.argv.slice(2);
const BIG = 400, SMALL = 60, ZOOM = 4;
const GAP = 24, PAD = 24, LABEL = 34;

// masque squircle façon iOS : superellipse n=5
function squircle(size) {
  const r = size / 2, n = 5;
  const pts = [];
  for (let i = 0; i <= 360; i++) {
    const t = (i * Math.PI) / 180;
    const c = Math.cos(t), s = Math.sin(t);
    const x = r + r * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = r + r * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return Buffer.from(
    `<svg width="${size}" height="${size}"><polygon points="${pts.join(" ")}" fill="#fff"/></svg>`,
  );
}

async function masked(file, size) {
  const img = await sharp(file).resize(size, size, { fit: "cover" }).png().toBuffer();
  return sharp(img)
    .composite([{ input: squircle(size), blend: "dest-in" }])
    .png()
    .toBuffer();
}

const colW = BIG;
const W = PAD * 2 + files.length * colW + (files.length - 1) * GAP;
const H = PAD * 2 + LABEL + BIG + GAP + SMALL * ZOOM;
const layers = [];
let svgText = "";

for (const [i, f] of files.entries()) {
  const x = PAD + i * (colW + GAP);
  const name = path.basename(f, ".png");
  svgText += `<text x="${x}" y="${PAD + 22}" font-family="Helvetica" font-size="20" fill="#111">${name}</text>`;
  layers.push({ input: await masked(f, BIG), left: x, top: PAD + LABEL });
  // 60 px réel, agrandi au voisin le plus proche pour montrer ce que l'oeil verra
  const small = await masked(f, SMALL);
  const zoomed = await sharp(small)
    .resize(SMALL * ZOOM, SMALL * ZOOM, { kernel: "nearest" })
    .png()
    .toBuffer();
  layers.push({ input: zoomed, left: x, top: PAD + LABEL + BIG + GAP });
}

const bg = Buffer.from(
  `<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#e8e8e8"/>${svgText}</svg>`,
);
await sharp(bg).composite(layers).png().toFile(path.join(DIR, "planche.png"));
console.log("✅ planche.png", W + "x" + H);
