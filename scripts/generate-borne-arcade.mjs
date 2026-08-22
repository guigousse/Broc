#!/usr/bin/env node
/**
 * Fabrique la façade de la borne d'arcade du Bazar.
 *
 * Deux modes :
 *   node scripts/generate-borne-arcade.mjs --from <fichier.png>   # détoure un tirage existant
 *   node scripts/generate-borne-arcade.mjs --generer [n]          # produit n nouveaux tirages
 *
 * DEUX PIÈGES PAYÉS COMPTANT, encodés ici :
 *
 * 1. On ne demande JAMAIS « fond transparent » à Gemini : il PEINT un damier
 *    et rend une image parfaitement opaque. On demande un aplat vert franc,
 *    qu'on découpe nous-mêmes. (Constaté le 2026-08-22, et déjà sur les
 *    profils de camions.)
 * 2. Le fond vert se découpe par DIFFUSION depuis les bords, jamais par
 *    sélection de couleur : le pupitre porte des boutons verts qu'une
 *    sélection globale percerait aussi. Le magenta de l'écran, lui, peut
 *    partir par sélection — il n'apparaît nulle part ailleurs.
 */
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = path.join(ROOT, "public", "bazar", "borne-facade.webp");
const SORTIE_SOCLE = path.join(ROOT, "public", "bazar", "borne-socle.webp");
const SORTIE_BANDE = path.join(ROOT, "public", "bazar", "borne-socle-bande.webp");
const REFERENCE = path.join(ROOT, "public", "bazar", "borne-arcade.webp");

const args = process.argv.slice(2);
const from = args.includes("--from") ? args[args.indexOf("--from") + 1] : null;
const generer = args.includes("--generer");
const socleGenerer = args.includes("--socle-generer");
const socleFrom = args.includes("--socle-from") ? args[args.indexOf("--socle-from") + 1] : null;

const PROMPT_INTRO =
  "Reference image (attached): an arcade cabinet drawn in the exact style to keep. " +
  "Preserve its identity down to the details — the same wooden body, the same warm brown and " +
  "terracotta palette, the same thick hand-inked cartoon outlines, the same soft cel shading, " +
  "the same amber ARCADE marquee with its swirling background, the same red ball-top joysticks " +
  "and the same clusters of round colored buttons. Redraw this same cabinet as described below.";

const PROMPT_SUJET = [
  "Front elevation of the same arcade cabinet, strictly frontal and straight-on, camera at screen",
  "height, both side panels hidden behind the front face, every horizontal edge perfectly horizontal",
  "and every vertical edge perfectly vertical.",
  "",
  "THE ONE CHANGE: the monitor is BIG. It is a wide 4:3 screen, wider than tall, and it fills almost",
  "the whole front of the cabinet: the bezel around it is a NARROW strip, a thin dark frame just a few",
  "centimetres wide on each side, so the glass reaches nearly to the left and right edges of the cabinet.",
  "The screen is the dominant feature of the image.",
  "",
  "Top to bottom: a slim illuminated marquee header with ARCADE in chunky amber letters; immediately",
  "below it the big 4:3 screen inside its thin bezel; below that the control panel with two ball-top",
  "joysticks and two clusters of round colored buttons. The image is cropped just below the control panel.",
  "",
  "The screen area is filled edge to edge with ONE single flat uniform saturated magenta (RGB 255, 0, 255),",
  "a smooth evenly lit block of pure color, exactly like a chroma-key screen on a film set.",
  "",
  "The area around the cabinet is filled with ONE single flat uniform saturated pure green (RGB 0, 255, 0),",
  "a smooth even backdrop, exactly like a chroma-key green screen. The cabinet keeps a crisp clean silhouette.",
].join(" ");

async function chargerEnv() {
  try {
    const contenu = await fs.readFile(path.join(ROOT, ".env"), "utf8");
    for (const ligne of contenu.split("\n")) {
      const l = ligne.trim();
      if (!l || l.startsWith("#")) continue;
      const eq = l.indexOf("=");
      if (eq < 0) continue;
      const k = l.slice(0, eq).trim();
      let v = l.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* pas de .env */
  }
}

async function tirages(n) {
  await chargerEnv();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const ref = await fs.readFile(REFERENCE);
  const contents = [
    {
      role: "user",
      parts: [
        { text: PROMPT_INTRO },
        { inlineData: { mimeType: "image/webp", data: ref.toString("base64") } },
        { text: `Subject: ${PROMPT_SUJET}` },
      ],
    },
  ];
  for (let i = 1; i <= n; i++) {
    const res = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents,
      config: { imageConfig: { aspectRatio: "4:3", imageSize: "2K" } },
    });
    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData?.data);
    if (!img) {
      console.log(`❌ tirage ${i} : pas d'image`);
      continue;
    }
    const out = path.join(ROOT, `borne-tirage-${i}.png`);
    await fs.writeFile(out, Buffer.from(img.inlineData.data, "base64"));
    console.log(`✅ ${out}`);
  }
  console.log("Choisir un tirage, puis relancer avec --from <fichier>.");
}

/**
 * Le fond vert, ôté par DIFFUSION depuis les bords et jamais par sélection de
 * couleur : le pupitre porte des boutons verts qu'une sélection globale
 * percerait aussi, et ils ne touchent aucun bord.
 *
 * Partagé par la façade et par le bas du meuble — les deux tirages sortent du
 * même studio vert, ils se découpent de la même façon.
 */
async function surFondDecoupe(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const idx = (x, y) => (y * W + x) * 4;
  const estVert = (x, y) => {
    const i = idx(x, y);
    return (
      data[i + 1] > 150 &&
      data[i] < 140 &&
      data[i + 2] < 140 &&
      data[i + 1] - Math.max(data[i], data[i + 2]) > 60
    );
  };
  const vu = new Uint8Array(W * H);
  const pile = [];
  for (let x = 0; x < W; x++) pile.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) pile.push([0, y], [W - 1, y]);
  while (pile.length) {
    const [x, y] = pile.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const p = y * W + x;
    if (vu[p] || !estVert(x, y)) continue;
    vu[p] = 1;
    data[idx(x, y) + 3] = 0;
    pile.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return { data, W, H, idx };
}

/** Les bornes du dessin restant, une fois le fond ôté. */
function bornesOpaques(data, W, H, idx) {
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[idx(x, y) + 3] > 128) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1 };
}

async function detourer(src) {
  const { data, W, H, idx } = await surFondDecoupe(src);

  // 2. le magenta de l'écran, par sélection.
  let sx0 = W;
  let sy0 = H;
  let sx1 = -1;
  let sy1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (data[i] > 190 && data[i + 2] > 190 && data[i + 1] < 90) {
        data[i + 3] = 0;
        if (x < sx0) sx0 = x;
        if (x > sx1) sx1 = x;
        if (y < sy0) sy0 = y;
        if (y > sy1) sy1 = y;
      }
    }
  }

  // 3. rogner aux bornes du caisson.
  const { x0: ax0, y0: ay0, x1: ax1, y1: ay1 } = bornesOpaques(data, W, H, idx);
  const cw = ax1 - ax0 + 1;
  const ch = ay1 - ay0 + 1;

  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: ax0, top: ay0, width: cw, height: ch })
    .resize({ width: 1000 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(SORTIE);

  const pct = (v, base, off) => +((100 * (v - off)) / base).toFixed(2);
  console.log(`✅ ${SORTIE}`);
  console.log(`   caisson  ${cw} × ${ch}  ratio ${(cw / ch).toFixed(3)}`);
  console.log("   ── à recopier dans borneArcadeLayout.ts ──");
  console.log(`   ratio : ${(cw / ch).toFixed(3)}`);
  console.log(
    `   trou  : left ${pct(sx0, cw, ax0)}  right ${(100 - pct(sx1 + 1, cw, ax0)).toFixed(2)}` +
      `  top ${pct(sy0, ch, ay0)}  bottom ${(100 - pct(sy1 + 1, ch, ay0)).toFixed(2)}`,
  );
}


// ———————————————————————————————————————————————————————————————
// LE BAS DU MEUBLE — la partie en bois et son monnayeur
// ———————————————————————————————————————————————————————————————

/**
 * La façade sert de RÉFÉRENCE ici, et pas `borne-arcade.webp` : c'est elle
 * qu'on prolonge, c'est donc sa palette, ses montants et son épaisseur de trait
 * qu'il faut retrouver au raccord. Se référer à la vignette de la scène ferait
 * dessiner un autre meuble.
 */
/**
 * La RÉFÉRENCE est la borne de la scène, et surtout pas la façade.
 *
 * La façade s'arrête sous le pupitre : elle ne sait rien du bas du meuble, et
 * s'en servir revient à faire inventer un monnayeur à Gemini — ce qu'il a fait,
 * et il en a dessiné un autre. `borne-arcade.webp` est le dessin d'origine du
 * meuble ENTIER, monnayeur compris : c'est lui qui fait foi. Le prompt ne fait
 * que décrire ce qu'on y voit, pour que le modèle ne s'en écarte pas.
 */
const PROMPT_SOCLE_INTRO =
  "Reference image (attached): the arcade cabinet of this game, drawn in three-quarter view. This " +
  "is the ONE cabinet to reproduce — its identity, its palette and its details are all in this " +
  "drawing. Keep the same warm mid-brown wood with its visible vertical grain, the same terracotta " +
  "and gold trim, the same thick hand-inked cartoon outlines and the same soft cel shading.";

const PROMPT_SOCLE_SUJET = [
  "Draw ONLY THE LOWER PART of this same cabinet — the wooden body below the control panel, from",
  "just under the control panel down to the floor. The marquee, the screen and the control panel are",
  "outside the frame: the drawing starts at the top of the wooden body.",
  "",
  "VIEW: strictly frontal and straight-on, a flat front elevation, camera facing the cabinet square.",
  "The reference is drawn in three-quarter view; turn it to face the viewer. Both side panels are",
  "hidden behind the front face, every horizontal edge is perfectly horizontal and every vertical",
  "edge perfectly vertical. The body is one straight-sided rectangle, as wide at the bottom as at",
  "the top.",
  "",
  "WHAT THE FRONT CARRIES, exactly as in the reference:",
  "a warm mid-brown wooden panel with visible vertical grain fills the whole front;",
  "at the extreme left and right edges, a plain warm brown WOODEN SIDE RAIL runs from top to bottom,",
  "a narrow upright band about one fiftieth of the width — it is the side of the cabinet seen edge",
  "on, and it is the outermost thing in the drawing, bare wood with no trim on it;",
  "just INSIDE each of those two rails, and not touching the edge, runs a vertical trim stripe: a",
  "terracotta red band edged with a thin gold line, the two mirroring each other;",
  "centred between them, the coin door: an upright grey-green steel plate with two small RED coin",
  "slots side by side at the top, two small dark square buttons below them, and a small round",
  "keyhole to their right;",
  "directly under that plate, a second wider grey-green steel panel — the cash box door — with a",
  "small round knob near its right edge;",
  "at the very bottom, the wooden body meets the floor on a plain dark kick plate.",
  "",
  "The wooden panel is the subject and fills most of the image; the coin door is one detail sitting",
  "on it, about a fifth of the width.",
  "",
  "The area around the cabinet is filled with ONE single flat uniform saturated pure green",
  "(RGB 0, 255, 0), a smooth even backdrop, exactly like a chroma-key green screen. The cabinet keeps",
  "a crisp clean silhouette against it.",
].join(" ");

async function socleTirages(n) {
  await chargerEnv();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const ref = await fs.readFile(REFERENCE);
  const contents = [
    {
      role: "user",
      parts: [
        { text: PROMPT_SOCLE_INTRO },
        { inlineData: { mimeType: "image/webp", data: ref.toString("base64") } },
        { text: `Subject: ${PROMPT_SOCLE_SUJET}` },
      ],
    },
  ];
  for (let i = 1; i <= n; i++) {
    const res = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents,
      config: { imageConfig: { aspectRatio: "4:3", imageSize: "2K" } },
    });
    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData?.data);
    if (!img) {
      console.log(`❌ tirage ${i} : pas d'image`);
      continue;
    }
    const out = path.join(ROOT, `borne-socle-tirage-${i}.png`);
    await fs.writeFile(out, Buffer.from(img.inlineData.data, "base64"));
    console.log(`✅ ${out}`);
  }
  console.log("Choisir un tirage, puis relancer avec --socle-from <fichier>.");
}


/**
 * Découpe un tirage de bas de meuble et le fait tomber PILE sous la façade.
 *
 * Le tirage redessine toujours le pupitre et son galon en chevron — il faut
 * bien les lui montrer pour qu'il sache où il est. On ne garde donc que ce qui
 * commence AU BOIS, et deux réglages font le raccord :
 *
 * 1. LA LIGNE DE COUPE se trouve par la plus longue plage de lignes à
 *    dominante bois. Chercher « la première ligne brune » attraperait l'or du
 *    galon, qui est de la même famille de teinte ; la plus longue plage, non :
 *    le galon fait quelques lignes, le panneau en fait des centaines.
 *
 * 2. L'ÉCHELLE se prend sur la largeur de la silhouette À CETTE LIGNE, et non
 *    sur les bornes globales du dessin. C'est LE point : le pupitre déborde du
 *    corps, donc caler sur les bornes globales rétrécit le bois et ouvre une
 *    marche de part et d'autre du raccord. Calé sur la ligne de coupe, le
 *    meuble a exactement la largeur qu'il avait au bas de la façade, et ce
 *    qu'il fait plus bas (se resserrer un peu, par perspective) est juste.
 *
 * On pose enfin quelques lignes de la dernière ligne de la façade au-dessus du
 * bois : le raccord de couleur devient exact par construction, et non « assez
 * proche ».
 */
async function socleDepuis(src) {
  const { data, W, H, idx } = await surFondDecoupe(src);

  // Où commence le bois : plus longue plage de lignes à dominante brun chaud.
  const estBois = (x, y) => {
    const i = idx(x, y);
    if (data[i + 3] < 128) return false;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    return r > 95 && r - b > 30 && g - b > 8;
  };
  // On juge sur DEUX FENÊTRES LATÉRALES et jamais sur le centre : le monnayeur
  // est au milieu et couvre le bois sur presque toute la hauteur — jugé au
  // centre, le « plus long » se trouvait sous la trappe à monnaie et la coupe
  // tombait 1400 lignes trop bas. Les fenêtres sont posées entre le galon et
  // le monnayeur, là où il n'y a que du bois du haut en bas.
  //
  // Et elles se calent sur les bornes du MEUBLE, pas de l'image : le dessin
  // n'occupe qu'une partie du tirage, des pourcentages de l'image tomberaient
  // dans le fond.
  const b = bornesOpaques(data, W, H, idx);
  const bw = b.x1 - b.x0 + 1;
  const fenetres = [
    [b.x0 + Math.round(bw * 0.14), b.x0 + Math.round(bw * 0.28)],
    [b.x0 + Math.round(bw * 0.72), b.x0 + Math.round(bw * 0.86)],
  ];
  const dominante = [];
  for (let y = 0; y < H; y++) {
    let bois = 0;
    let opaques = 0;
    for (const [a, z] of fenetres) {
      for (let x = a; x <= z; x++) {
        if (data[idx(x, y) + 3] >= 128) {
          opaques++;
          if (estBois(x, y)) bois++;
        }
      }
    }
    dominante.push(opaques > 0 && bois / opaques > 0.6);
  }
  let debut = -1;
  let meilleur = { debut: -1, longueur: 0 };
  for (let y = 0; y <= H; y++) {
    if (y < H && dominante[y]) {
      if (debut < 0) debut = y;
    } else if (debut >= 0) {
      if (y - debut > meilleur.longueur) meilleur = { debut, longueur: y - debut };
      debut = -1;
    }
  }
  if (meilleur.debut < 0) throw new Error("aucune plage de bois trouvée dans le tirage");
  const yCoupe = meilleur.debut;

  // La silhouette à cette ligne, qui donne l'échelle.
  let sx0 = -1;
  let sx1 = -1;
  for (let x = 0; x < W; x++) {
    if (data[idx(x, yCoupe) + 3] > 128) {
      if (sx0 < 0) sx0 = x;
      sx1 = x;
    }
  }
  const largeurCoupe = sx1 - sx0 + 1;

  // LA CIBLE : la largeur de la façade AU CENTRE DE L'ÉCRAN, et non à sa base.
  //
  // Le meuble est vu en légère plongée : son bas est plus RENFONCÉ que le
  // plan de l'écran, et une base aussi large que le pupitre le ferait paraître
  // en avant. L'auteur a donné le repère à la recette du 2026-08-23 : l'arête
  // du bas doit s'aligner sur l'arête prise à mi-hauteur de l'écran. Mesuré :
  // 857 px là contre 994 à la dernière ligne, soit 13,8 % de fuyant.
  const { width: FW, height: FH } = await sharp(SORTIE).metadata();
  const facade = await sharp(SORTIE).ensureAlpha().raw().toBuffer();
  const spanFacade = (y) => {
    let a = -1;
    let z = -1;
    for (let x = 0; x < FW; x++) {
      if (facade[(y * FW + x) * 4 + 3] > 128) {
        if (a < 0) a = x;
        z = x;
      }
    }
    return [a, z];
  };

  // Le trou du CRT se repère tout seul : ce sont les lignes qui portent
  // beaucoup de transparent ENTRE leurs deux bords opaques. Le détecter plutôt
  // que recopier des pourcentages garde ce script juste après une nouvelle
  // façade, sans qu'on ait à penser à le mettre à jour.
  //
  // Par la plus LONGUE plage de telles lignes, et non par la première et la
  // dernière : le sommet du caisson est arqué, ses deux coins y laissent un
  // grand vide entre eux, et pris pour le trou il tirait le centre 130 lignes
  // trop haut (846 px de cible au lieu de 857).
  const creuse = [];
  for (let y = 0; y < FH; y++) {
    const [a, z] = spanFacade(y);
    if (a < 0) {
      creuse.push(false);
      continue;
    }
    let creux = 0;
    for (let x = a; x <= z; x++) if (facade[(y * FW + x) * 4 + 3] <= 128) creux++;
    creuse.push(creux > (z - a) * 0.3);
  }
  let debutTrou = -1;
  let plage = { debut: -1, longueur: 0 };
  for (let y = 0; y <= FH; y++) {
    if (y < FH && creuse[y]) {
      if (debutTrou < 0) debutTrou = y;
    } else if (debutTrou >= 0) {
      if (y - debutTrou > plage.longueur) plage = { debut: debutTrou, longueur: y - debutTrou };
      debutTrou = -1;
    }
  }
  if (plage.debut < 0) throw new Error("trou du CRT introuvable dans la façade");
  const yTrou0 = plage.debut;
  const yTrou1 = plage.debut + plage.longueur - 1;
  const yEcran = Math.round((yTrou0 + yTrou1) / 2);
  const [tx0, tx1] = spanFacade(yEcran);
  const echelle = (tx1 - tx0 + 1) / largeurCoupe;

  // Remise à l'échelle, puis fenêtre de FW de large calée sur le raccord.
  const larg = Math.max(1, Math.round(W * echelle));
  const redim = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: 0, top: yCoupe, width: W, height: H - yCoupe })
    .resize({ width: larg })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decalage = Math.round(sx0 * echelle) - tx0;
  const hArt = redim.info.height;
  const art = Buffer.alloc(FW * hArt * 4);
  for (let y = 0; y < hArt; y++) {
    for (let x = 0; x < FW; x++) {
      const sx = x + decalage;
      if (sx < 0 || sx >= larg) continue;
      art.set(redim.data.subarray((y * larg + sx) * 4, (y * larg + sx) * 4 + 4), (y * FW + x) * 4);
    }
  }

  // Rogner le vide sous le meuble. Le tirage garde du fond sous la plinthe :
  // laissé là, il donne une dernière ligne TRANSPARENTE, et la bande de
  // plinthe qui s'en déduit ne peint plus rien.
  let hUtile = hArt;
  while (hUtile > 1) {
    let opaque = false;
    for (let x = 0; x < FW && !opaque; x++) if (art[((hUtile - 1) * FW + x) * 4 + 3] > 128) opaque = true;
    if (opaque) break;
    hUtile--;
  }

  // Le raccord : quelques lignes de la dernière ligne de la façade, RESSERRÉES
  // à la largeur cible, posées au-dessus du bois. Resserrées et pas recopiées
  // telles quelles : le bas est maintenant plus étroit que la base de la
  // façade, une bande pleine largeur dépasserait de part et d'autre du meuble.
  const [fx0, fx1] = spanFacade(FH - 1);
  const derniereResserree = await sharp(facade, { raw: { width: FW, height: FH, channels: 4 } })
    .extract({ left: fx0, top: FH - 1, width: fx1 - fx0 + 1, height: 1 })
    .resize({ width: tx1 - tx0 + 1, height: 1, fit: "fill" })
    .raw()
    .toBuffer();
  const ligneRaccord = Buffer.alloc(FW * 4);
  ligneRaccord.set(derniereResserree, tx0 * 4);

  const RACCORD = Math.round(FH * 0.02);
  const hTotal = RACCORD + hUtile;
  const sortie = Buffer.alloc(FW * hTotal * 4);
  for (let y = 0; y < RACCORD; y++) sortie.set(ligneRaccord, y * FW * 4);
  sortie.set(art.subarray(0, hUtile * FW * 4), RACCORD * FW * 4);

  await sharp(sortie, { raw: { width: FW, height: hTotal, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(SORTIE_SOCLE);

  // La bande étirable, tirée de la DERNIÈRE ligne du socle : elle prolonge la
  // plinthe quand un cadre très allongé laisse plus de place que le dessin.
  const bas = await sharp(SORTIE_SOCLE)
    .ensureAlpha()
    .extract({ left: 0, top: hTotal - 1, width: FW, height: 1 })
    .raw()
    .toBuffer();
  await sharp(bas, { raw: { width: FW, height: 1, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(SORTIE_BANDE);

  console.log(`✅ ${SORTIE_SOCLE}  ${FW} × ${hTotal}`);
  console.log(`✅ ${SORTIE_BANDE}  ${FW} × 1`);
  console.log("   ── à recopier dans borneArcadeLayout.ts ──");
  console.log(`   ratio du socle : ${(FW / hTotal).toFixed(3)}`);
  console.log(
    `   coupe à y=${yCoupe}/${H}, silhouette ${largeurCoupe}px → ${tx1 - tx0 + 1}px (×${echelle.toFixed(3)})`,
  );
  console.log(
    `   cible prise au centre de l'écran (y=${yEcran}) : ${tx1 - tx0 + 1}px, contre ${fx1 - fx0 + 1}px à la base`,
  );
}

if (socleFrom) {
  await socleDepuis(socleFrom);
} else if (socleGenerer) {
  await socleTirages(Number(args[args.indexOf("--socle-generer") + 1]) || 3);
} else if (generer) {
  const n = Number(args[args.indexOf("--generer") + 1]) || 3;
  await tirages(n);
} else if (from) {
  await detourer(from);
  // Le socle se cale sur la DERNIÈRE LIGNE de la façade (couleur et largeur de
  // silhouette) : une façade refaite oblige à repasser `--socle-from` sur son
  // tirage de bas de meuble, sinon le raccord dérive.
  console.log("⚠  Refaire aussi le bas : --socle-generer puis --socle-from <tirage>.");
} else {
  console.error(
    "Usage : --from <f.png> | --generer [n] | --socle-generer [n] | --socle-from <f.png>",
  );
  process.exit(1);
}
