import sharp from "sharp";
import { readdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const DIR = "public/items";
const files = (await readdir(DIR)).filter((f) => f.endsWith(".png"));

console.log(`${files.length} PNG à convertir.`);
let totalIn = 0;
let totalOut = 0;

for (const file of files) {
  const src = join(DIR, file);
  // Retire un éventuel " - copie" / " - copie 2" / " - copie N" et l'extension.
  const baseName = file
    .replace(/ - copie( \d+)?\.png$/i, ".png")
    .replace(/\.png$/i, "");
  const out = join(DIR, `${baseName}.webp`);

  const buf = await sharp(src).webp({ quality: 90, effort: 6 }).toBuffer();
  await sharp(buf).toFile(out);

  const inMeta = await sharp(src).metadata();
  const inBytes = inMeta.size ?? 0;
  totalIn += inBytes;
  totalOut += buf.length;

  console.log(
    `  ${baseName.padEnd(50)} ${(inBytes / 1024).toFixed(0).padStart(5)}KB → ${(buf.length / 1024).toFixed(0).padStart(4)}KB`,
  );

  await unlink(src);
}

console.log(
  `\nTotal : ${(totalIn / 1024).toFixed(0)}KB → ${(totalOut / 1024).toFixed(0)}KB (×${(totalIn / totalOut).toFixed(1)} compression)`,
);
console.log("PNG sources supprimés.");
