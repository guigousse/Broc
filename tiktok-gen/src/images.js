/** Chargement et préparation des images (objets, fonds, silhouettes). Module DOM/canvas, pas de tests unitaires. */
import { LARGEUR, HAUTEUR } from "./roulette.js";

export function chargerImage(url) {
  return new Promise((resoudre, rejeter) => {
    const img = new Image();
    img.onload = () => resoudre(img);
    img.onerror = () => rejeter(new Error(`image introuvable : ${url}`));
    img.src = url;
  });
}

/**
 * Découpe une silhouette : masque alpha de `img`, rempli de noir à 85 %.
 * Même taille que l'objet (échelle 1) : dessinée au même centre et à la même
 * hauteur, elle se superpose exactement à la cible quand celle-ci passe.
 */
export function creerSilhouette(img, echelle = 1) {
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * echelle);
  c.height = Math.round(img.naturalHeight * echelle);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, c.width, c.height);
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
export function preparerFond(img, flou = 0) {
  const c = document.createElement("canvas");
  c.width = LARGEUR; c.height = HAUTEUR;
  const ctx = c.getContext("2d");
  const iw = img.naturalWidth ?? img.width, ih = img.naturalHeight ?? img.height;
  const marge = flou > 0 ? flou * 2 : 0;
  const k = Math.max((LARGEUR + marge * 2) / iw, (HAUTEUR + marge * 2) / ih);
  const w = iw * k, h = ih * k;
  const x = (LARGEUR - w) / 2, y = (HAUTEUR - h) / 2;
  if (flou <= 0) { ctx.drawImage(img, x, y, w, h); return c; }
  if ("filter" in ctx) {
    ctx.filter = `blur(${flou}px)`;
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
  fondPrepare(nom, flou) { return this.#memo(`fondp:${nom}:${flou}`, async () => preparerFond(await this.fond(nom), flou)); }
  silhouette(id) { return this.#memo(`silh:${id}`, async () => creerSilhouette(await this.objet(id))); }
}
