// Outils du panorama-rue : tranche de référence + assemblage avec fondu.
// Usage :
//   node .rue-tools.mjs slice <src> <largeurPx> <out>       — extrait la bande GAUCHE de src
//   node .rue-tools.mjs stitch <prev> <gen> <overlapPx> <blendPx> <out>
//     prev = panorama courant (la maison à droite), gen = nouvelle image (à coller à gauche),
//     la bande DROITE de gen (overlapPx) recouvre la bande GAUCHE de prev ; fondu linéaire sur blendPx.
import sharp from "sharp";

const [, , cmd, ...args] = process.argv;

async function toHeight(img, h) {
  const m = await img.metadata();
  if (m.height === h) return img;
  return sharp(await img.resize({ height: h }).png().toBuffer());
}

if (cmd === "slice") {
  const [src, wStr, out] = args;
  const w = Number(wStr);
  const m = await sharp(src).metadata();
  await sharp(src).extract({ left: 0, top: 0, width: w, height: m.height }).png().toFile(out);
  console.log("slice →", out, `${w}x${m.height}`);
} else if (cmd === "stitch") {
  const [prevPath, genPath, overlapStr, blendStr, out] = args;
  const overlap = Number(overlapStr);
  const blend = Number(blendStr);
  const prevMeta = await sharp(prevPath).metadata();
  const H = prevMeta.height;

  // Redimensionne la génération à la hauteur du panorama.
  const gen = await toHeight(sharp(genPath), H);
  const genMeta = await gen.metadata();
  const W_gen = genMeta.width;

  // Largeurs : gen occupe [0, W_gen), prev commence à W_gen - overlap.
  const prevX = W_gen - overlap;
  const W_total = prevX + prevMeta.width;

  // Le fondu s'étale sur [prevX, prevX + blend) : gen alpha 1→0, prev en dessous.
  const genBuf = await gen.png().toBuffer();

  // Construit le masque alpha de gen : opaque jusqu'à prevX, rampe 1→0 sur blend, 0 ensuite.
  const mask = Buffer.alloc(W_gen * H);
  for (let x = 0; x < W_gen; x++) {
    let a = 255;
    if (x >= prevX + blend) a = 0;
    else if (x >= prevX) a = Math.round(255 * (1 - (x - prevX) / blend));
    for (let y = 0; y < H; y++) mask[y * W_gen + x] = a;
  }
  const genAvecAlpha = await sharp(genBuf)
    .ensureAlpha()
    .joinChannel(mask, { raw: { width: W_gen, height: H, channels: 1 } })
    .png()
    .toBuffer();
  // joinChannel AJOUTE un canal — on retire l'alpha d'origine d'abord.
  const genRgb = await sharp(genBuf).removeAlpha().png().toBuffer();
  const genMasque = await sharp(genRgb)
    .joinChannel(mask, { raw: { width: W_gen, height: H, channels: 1 } })
    .png()
    .toBuffer();

  await sharp({ create: { width: W_total, height: H, channels: 3, background: "#000" } })
    .composite([
      { input: prevPath, left: prevX, top: 0 },
      { input: genMasque, left: 0, top: 0 },
    ])
    .png()
    .toFile(out);
  console.log("stitch →", out, `${W_total}x${H} (gen ${W_gen}, overlap ${overlap}, blend ${blend})`);
} else {
  console.error("cmd inconnue");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// PIPELINE COMPLET du panorama-rue (2026-07-07) :
// 1. La façade maître : public/qg/facade-maison.png (entrée facade-maison de
//    qg-prompts.json — historique des passes dans le git log).
// 2. Tranche de bord : node scripts/rue-tools.mjs slice public/qg/facade-maison.png 1400 public/qg/panorama-rue-ref.png
// 3. Trois segments « période » (café / boulangerie / fleuriste+librairie),
//    entrée panorama-rue de qg-prompts.json avec références multiples
//    [facade-maison, panorama-rue-ref] — le modèle réplique la tranche aux
//    DEUX bords de chaque segment (structure tuilable).
// 4. Assemblage droite→gauche, coupe cachée dans les troncs d'arbres, en
//    jetant la réplique de bord de chaque segment (overlap 780, blend 60) :
//    node scripts/rue-tools.mjs stitch <panorama> <segment> 780 60 <out>
// Master final : docs/art/panorama-rue.webp (q95) ; PNG intégral non versionné.
// ---------------------------------------------------------------------------
