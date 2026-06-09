import sharp from "sharp";
import { unlink } from "node:fs/promises";

const PAIRS = [
  {
    src: "public/coffre/utilitaire-ouvert avec arrière-plan supprimé.png",
    out: "public/coffre/utilitaire-ouvert.webp",
  },
  {
    src: "public/coffre/utilitaire-ferme avec arrière-plan supprimé.png",
    out: "public/coffre/utilitaire-ferme.webp",
  },
];

for (const { src, out } of PAIRS) {
  const meta = await sharp(src).metadata();
  await sharp(src).webp({ quality: 90, effort: 6 }).toFile(out);
  const outMeta = await sharp(out).metadata();
  const outBytes = (await sharp(out).toBuffer()).length;
  console.log(
    `${out}: ${meta.width}×${meta.height} → ${outMeta.width}×${outMeta.height}, ${(outBytes / 1024).toFixed(1)} KB`,
  );
  await unlink(src);
}
console.log("PNG sources supprimés.");
