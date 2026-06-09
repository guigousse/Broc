import sharp from "sharp";

const SRC = "public/coffre/fond garage - Grande.png";
const OUT = "public/coffre/fond-garage.webp";

const meta = await sharp(SRC).metadata();
console.log(`source : ${meta.width}×${meta.height}, ${meta.format}`);

await sharp(SRC).webp({ quality: 85, effort: 6 }).toFile(OUT);

const outMeta = await sharp(OUT).metadata();
const outBytes = (await sharp(OUT).toBuffer()).length;
console.log(`output : ${outMeta.width}×${outMeta.height} ${outMeta.format}, ${(outBytes / 1024).toFixed(1)} KB`);
