/** Chargement et préparation des images (objets, fonds, silhouettes). Module DOM/canvas, pas de tests unitaires. */
import { LARGEUR, HAUTEUR, HAUTEUR_OBJET } from "./roulette.js";

export function chargerImage(url) {
  return new Promise((resoudre, rejeter) => {
    const img = new Image();
    img.onload = () => resoudre(img);
    img.onerror = () => rejeter(new Error(`image introuvable : ${url}`));
    img.src = url;
  });
}

/** Épaisseur du liseré de la silhouette autour de l'objet, en px du cadre (à la hauteur d'affichage). */
export const OFFSET_SILHOUETTE = 17;
/** Directions de la dilatation : 24 pas d'angle, deux rayons → contour rond, sans facettes visibles. */
const DIRECTIONS = 24;

/**
 * Silhouette = le masque alpha de `img` DILATÉ d'un liseré d'épaisseur
 * constante, rempli de noir à 85 %. Une simple mise à l'échelle ne convient
 * pas : elle agrandit autour du centre de la boîte (l'objet n'y est pas
 * centré → silhouette décalée) et donne un liseré inégal (fin sur un manche,
 * large sur une tête). Ici le masque est recopié dans `DIRECTIONS` directions
 * sur un rayon `r`, puis `r/2` : l'union est le contour arrondi de la forme.
 *
 * Le canvas rendu déborde l'image de `r` de chaque côté ; son centre reste
 * celui de l'image. `echelleHauteur` (= (h + 2r) / h) dit à quelle hauteur le
 * dessiner pour que la forme intérieure coïncide exactement avec l'objet.
 */
export function creerSilhouette(img, offsetPx = OFFSET_SILHOUETTE, hauteurAffichee = HAUTEUR_OBJET) {
  const w = img.naturalWidth ?? img.width, h = img.naturalHeight ?? img.height;
  const r = Math.max(1, Math.round((offsetPx * h) / hauteurAffichee));   // offset ramené aux px de l'image
  const c = document.createElement("canvas");
  c.width = w + 2 * r; c.height = h + 2 * r;
  const ctx = c.getContext("2d");
  for (const rayon of [r, r / 2]) {
    for (let k = 0; k < DIRECTIONS; k++) {
      const a = (2 * Math.PI * k) / DIRECTIONS;
      ctx.drawImage(img, r + rayon * Math.cos(a), r + rayon * Math.sin(a));
    }
  }
  ctx.drawImage(img, r, r);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, c.width, c.height);
  c.echelleHauteur = (h + 2 * r) / h;
  return c;
}

/**
 * Le fond prêt à peindre : un canvas plein cadre (1080×1920), image en cover,
 * flouté de `flou` px. Calculé UNE fois par (fond, flou) et non par frame : un
 * blur à chaque image coûterait la cadence sur téléphone.
 *
 * Le blur canvas laisse les bords transparents sur `flou` px : l'image est
 * peinte agrandie d'autant, débordant du cadre, pour que le fond reste plein.
 * Sans `ctx.filter` (WebKit ancien), on retombe sur un flou par
 * sous-échantillonnage : l'image est réduite puis ré-agrandie, deux fois.
 */
/**
 * Sature (ou désature) des pixels RGBA en place : chaque couleur est écartée
 * de sa luminance (Rec. 709) d'un facteur `pourcent/100`. Pure, testable.
 */
export function saturerPixels(data, pourcent) {
  const k = pourcent / 100;
  if (k === 1) return data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i] = y + (r - y) * k; data[i + 1] = y + (g - y) * k; data[i + 2] = y + (b - y) * k;
  }
  return data;
}

export function preparerFond(img, flou = 0, saturation = 100) {
  const c = preparerFondFlou(img, flou, saturation);
  if (saturation === 100 || "filter" in c.getContext("2d")) return c;
  // Repli sans `ctx.filter` : une passe pixel, une seule fois par (fond, flou, saturation).
  const ctx = c.getContext("2d");
  const donnees = ctx.getImageData(0, 0, c.width, c.height);
  saturerPixels(donnees.data, saturation);
  ctx.putImageData(donnees, 0, 0);
  return c;
}

function preparerFondFlou(img, flou, saturation) {
  const c = document.createElement("canvas");
  c.width = LARGEUR; c.height = HAUTEUR;
  const ctx = c.getContext("2d");
  const iw = img.naturalWidth ?? img.width, ih = img.naturalHeight ?? img.height;
  const marge = flou > 0 ? flou * 2 : 0;
  const k = Math.max((LARGEUR + marge * 2) / iw, (HAUTEUR + marge * 2) / ih);
  const w = iw * k, h = ih * k;
  const x = (LARGEUR - w) / 2, y = (HAUTEUR - h) / 2;
  const filtres = [];
  if (saturation !== 100) filtres.push(`saturate(${saturation}%)`);
  if (flou > 0) filtres.push(`blur(${flou}px)`);
  if ("filter" in ctx || flou <= 0) {
    if (filtres.length && "filter" in ctx) ctx.filter = filtres.join(" ");
    ctx.drawImage(img, x, y, w, h);
    return c;
  }
  // Repli : réduction d'un facteur ≈ flou/2 puis agrandissement lissé, deux passes.
  const facteur = Math.max(2, Math.round(flou / 2));
  const petit = document.createElement("canvas");
  petit.width = Math.ceil(LARGEUR / facteur); petit.height = Math.ceil(HAUTEUR / facteur);
  const pctx = petit.getContext("2d");
  pctx.imageSmoothingEnabled = true; pctx.imageSmoothingQuality = "high";
  pctx.drawImage(img, x / facteur, y / facteur, w / facteur, h / facteur);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(petit, 0, 0, LARGEUR, HAUTEUR);
  pctx.clearRect(0, 0, petit.width, petit.height);
  pctx.drawImage(c, 0, 0, petit.width, petit.height);
  ctx.drawImage(petit, 0, 0, LARGEUR, HAUTEUR);
  return c;
}

/** Cache mémoïsé des images d'objets, de fonds et de silhouettes (une promesse par clé). */
export class CacheImages {
  #cache = new Map();
  #memo(cle, fabrique) {
    if (!this.#cache.has(cle)) this.#cache.set(cle, fabrique());
    return this.#cache.get(cle);
  }
  objet(id) { return this.#memo(`objet:${id}`, () => chargerImage(`assets/items/${id}.webp`)); }
  fond(nom) { return this.#memo(`fond:${nom}`, () => chargerImage(nom.startsWith("data:") ? nom : `assets/fonds/${nom}.webp`)); }
  /** Fond plein cadre, flouté : voir `preparerFond`. */
  fondPrepare(nom, flou, saturation = 100) {
    return this.#memo(`fondp:${nom}:${flou}:${saturation}`, async () => preparerFond(await this.fond(nom), flou, saturation));
  }
  silhouette(id, offsetPx = OFFSET_SILHOUETTE) { return this.#memo(`silh:${id}:${offsetPx}`, async () => creerSilhouette(await this.objet(id), offsetPx)); }
}
