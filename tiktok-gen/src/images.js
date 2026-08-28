/** Chargement et préparation des images (objets, fonds, silhouettes). Module DOM/canvas, pas de tests unitaires. */

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

/** Cache mémoïsé des images d'objets, de fonds et de silhouettes (une promesse par clé). */
export class CacheImages {
  #cache = new Map();
  #memo(cle, fabrique) {
    if (!this.#cache.has(cle)) this.#cache.set(cle, fabrique());
    return this.#cache.get(cle);
  }
  objet(id) { return this.#memo(`objet:${id}`, () => chargerImage(`assets/items/${id}.webp`)); }
  fond(nom) { return this.#memo(`fond:${nom}`, () => chargerImage(nom.startsWith("data:") ? nom : `assets/fonds/${nom}.webp`)); }
  silhouette(id) { return this.#memo(`silh:${id}`, async () => creerSilhouette(await this.objet(id))); }
}
