import sharp from "sharp";

const CAMIONS = [
  { id: "rogers",     scale: 0.910, aspect: 1408 / 1358 },
  { id: "break",      scale: 0.975, aspect: 1718 / 1456 },
  { id: "utilitaire", scale: 0.990, aspect: 1269 / 1343 },
];

async function mesure(id) {
  const file = `public/coffre/${id}-mask.webp`;
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();
  let white = 0;
  for (let i = 0; i < raw.length; i += 4) {
    const r = raw[i], g = raw[i+1], b = raw[i+2], a = raw[i+3];
    if (a > 32 && (r + g + b) / 3 > 200) white++;
  }
  return { width, height, total: width * height, white, frac: white / (width * height) };
}

console.log(
  "id".padEnd(11),
  "img".padEnd(11),
  "blanc".padStart(10),
  "frac".padStart(7),
  "garageSc".padStart(9),
  "aspect".padStart(7),
  "aireDispo".padStart(10),
);
console.log("─".repeat(70));

const data = [];
for (const c of CAMIONS) {
  const m = await mesure(c.id);
  // aire occupée par le coffre à l'écran (en unités wrapper²)
  const truckArea = (c.scale * c.scale) / c.aspect;
  // aire de jeu réelle = fraction du masque × aire coffre
  const aireDispo = m.frac * truckArea;
  data.push({ ...c, ...m, truckArea, aireDispo });
  console.log(
    c.id.padEnd(11),
    `${m.width}×${m.height}`.padEnd(11),
    m.white.toLocaleString("fr").padStart(10),
    (m.frac * 100).toFixed(1).padStart(6) + "%",
    c.scale.toFixed(3).padStart(9),
    c.aspect.toFixed(3).padStart(7),
    aireDispo.toFixed(4).padStart(10),
  );
}

console.log("\n=== Ratios entre les coffres (aire de jeu réelle) ===");
const r = data[0].aireDispo;
const b = data[1].aireDispo;
const u = data[2].aireDispo;
console.log(`Rogers     : ×1.000  (référence)`);
console.log(`Break      : ×${(b/r).toFixed(3)}  (Break/Rogers)`);
console.log(`Utilitaire : ×${(u/r).toFixed(3)}  (Utilitaire/Rogers)`);
console.log(`Util/Break : ×${(u/b).toFixed(3)}`);

console.log("\n=== Propositions de capacitePlaces ===");
console.log("Option 1 — Échelle linéaire sur l'aire (Rogers=9) :");
console.log(`  Rogers     : 9`);
console.log(`  Break      : ${(9 * b/r).toFixed(1)}`);
console.log(`  Utilitaire : ${(9 * u/r).toFixed(1)}`);

console.log("\nOption 2 — Échelle linéaire sur l'aire (Rogers=12, plus généreux) :");
console.log(`  Rogers     : 12`);
console.log(`  Break      : ${(12 * b/r).toFixed(1)}`);
console.log(`  Utilitaire : ${(12 * u/r).toFixed(1)}`);

console.log("\nOption 3 — Cap = nombre d'objets de 1 place qui rentrent réellement");
console.log("  (cap × frac_masque ≈ nombre effectif d'items qui tiennent)");
for (const d of data) {
  const objetUnit = 1 / 9; // taille d'un objet de 1 place avec cap=9 en ref Rogers
  const fit = d.aireDispo / objetUnit; // nombre d'objets de cette taille qui rentrent
  console.log(`  ${d.id.padEnd(11)} : ~${fit.toFixed(1)} objets d'une place (cap théo ${fit.toFixed(0)})`);
}
