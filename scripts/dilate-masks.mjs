import sharp from "sharp";

const RADIUS = 40; // pixels d'offset autour du contenant

async function dilate(file, outFile) {
  const img = sharp(file);
  const { width: W, height: H } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();

  // Masque binaire 0/1 (1 = intérieur du contenant)
  const src = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = raw[i * 4], g = raw[i * 4 + 1], b = raw[i * 4 + 2], a = raw[i * 4 + 3];
    src[i] = a > 32 && (r + g + b) / 3 > 200 ? 1 : 0;
  }

  // Max-filter séparable, radius 20 (horizontal puis vertical).
  const temp = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const yW = y * W;
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - RADIUS);
      const x1 = Math.min(W - 1, x + RADIUS);
      let v = 0;
      for (let xi = x0; xi <= x1; xi++) {
        if (src[yW + xi]) { v = 1; break; }
      }
      temp[yW + x] = v;
    }
  }
  const dst = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const y0 = Math.max(0, y - RADIUS);
      const y1 = Math.min(H - 1, y + RADIUS);
      let v = 0;
      for (let yi = y0; yi <= y1; yi++) {
        if (temp[yi * W + x]) { v = 1; break; }
      }
      dst[y * W + x] = v;
    }
  }

  // Écriture : blanc opaque dans la zone dilatée, sinon transparent.
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    if (dst[i]) {
      out[i * 4] = 255; out[i * 4 + 1] = 255; out[i * 4 + 2] = 255; out[i * 4 + 3] = 255;
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .webp({ lossless: true })
    .toFile(outFile);
}

for (const id of ["rogers", "break", "utilitaire"]) {
  console.log(`dilating ${id}…`);
  await dilate(`public/coffre/${id}-mask.webp`, `public/coffre/${id}-mask-expanded.webp`);
}
console.log("done");
