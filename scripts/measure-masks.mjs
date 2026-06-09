import sharp from "sharp";
async function area(file) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();
  let white = 0;
  for (let i = 0; i < raw.length; i += 4) {
    const r = raw[i], g = raw[i+1], b = raw[i+2], a = raw[i+3];
    const luma = (r + g + b) / 3;
    if (a > 32 && luma > 200) white++;
  }
  return { width, height, total: width * height, white };
}
const r = await area("public/coffre/rogers-mask.webp");
const b = await area("public/coffre/break-mask.webp");
const u = await area("public/coffre/utilitaire-mask.webp");
console.log(`Rogers     : ${r.width}x${r.height}  blanc=${r.white.toLocaleString("fr")} px`);
console.log(`Break      : ${b.width}x${b.height}  blanc=${b.white.toLocaleString("fr")} px`);
console.log(`Utilitaire : ${u.width}x${u.height}  blanc=${u.white.toLocaleString("fr")} px`);
console.log();
console.log(`Rapport "contenant" Break / Rogers      : x${(b.white/r.white).toFixed(2)}`);
console.log(`Rapport "contenant" Utilitaire / Rogers : x${(u.white/r.white).toFixed(2)}`);
console.log(`Rapport "contenant" Utilitaire / Break  : x${(u.white/b.white).toFixed(2)}`);
