import sharp from "sharp";

async function bbox(file) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();
  let minX = width, minY = height, maxX = -1, maxY = -1, count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = raw[i], g = raw[i + 1], b = raw[i + 2], a = raw[i + 3];
      const luma = (r + g + b) / 3;
      if (a > 32 && luma > 200) {
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { width, height, white: count, bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } };
}

const masks = ["rogers", "break", "utilitaire"];
const results = {};
for (const id of masks) {
  const r = await bbox(`public/coffre/${id}-mask.webp`);
  results[id] = r;
}

// Choix design : padding de 20 px autour du contenant (en coords source).
const PADDING = 20;
console.log("Mesures bbox + padding 20px :");
console.log();
for (const id of masks) {
  const r = results[id];
  const padX = r.bbox.x - PADDING;
  const padY = r.bbox.y - PADDING;
  const padW = r.bbox.w + 2 * PADDING;
  const padH = r.bbox.h + 2 * PADDING;
  // zoom CSS pour que la zone (bbox + 20px) remplisse le container actuel (aspectRatio source)
  const zoomX = r.width / padW;
  const zoomY = r.height / padH;
  // On garde le zoom le plus généreux (le plus petit) pour que tout rentre.
  const zoom = Math.min(zoomX, zoomY);
  // Décalage du centre du contenant par rapport au centre de l'image (en fraction).
  const centerX = (padX + padW / 2) / r.width;
  const centerY = (padY + padH / 2) / r.height;
  console.log(
    `${id.padEnd(11)} image=${r.width}x${r.height}  bbox=[${r.bbox.x},${r.bbox.y}  ${r.bbox.w}x${r.bbox.h}]  zoom=${zoom.toFixed(3)}  center=(${centerX.toFixed(3)},${centerY.toFixed(3)})`,
  );
}

// Aire effective du contenant (bbox padding × bbox padding), normalisée.
console.log();
console.log("Aires des contenants (bbox+padding, comparaison) :");
const areas = {};
for (const id of masks) {
  const r = results[id];
  const padW = r.bbox.w + 2 * PADDING;
  const padH = r.bbox.h + 2 * PADDING;
  areas[id] = padW * padH;
  console.log(`  ${id.padEnd(11)} : ${padW}x${padH} = ${(padW * padH).toLocaleString("fr")} px²`);
}
console.log();
console.log(`Rapport Break / Rogers      : ×${(areas.break / areas.rogers).toFixed(2)}`);
console.log(`Rapport Utilitaire / Rogers : ×${(areas.utilitaire / areas.rogers).toFixed(2)}`);
console.log(`Rapport Utilitaire / Break  : ×${(areas.utilitaire / areas.break).toFixed(2)}`);
