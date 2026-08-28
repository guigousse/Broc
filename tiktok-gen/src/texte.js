/** Petits formatages de texte de l'interface. Fonctions pures, aucune dépendance au DOM. */

const TIRET = "—";

/** Articles retirés en tête de nom : élidés (l') d'abord, puis les autres suivis d'un espace. */
const ARTICLE = /^(?:l['’]\s*|(?:les|le|la|une|un|des)\s+)/i;

/**
 * Nom d'objet tel qu'on le glisse dans une phrase : sans article initial et
 * l'initiale en minuscule. « La lampe Art déco » → « lampe Art déco ».
 */
export function nomCourt(nom) {
  const brut = String(nom ?? "").trim().replace(/\s+/g, " ");
  if (!brut) return "";
  const sansArticle = brut.replace(ARTICLE, "").trim();
  const mot = sansArticle || brut;
  return mot.charAt(0).toLowerCase() + mot.slice(1);
}

/** Nombre exploitable, ou null : `Number(null)` vaut 0, ce qui masquerait une valeur absente. */
const nombre = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));

/** Durée en secondes, une décimale, virgule française : 12 → « 12,0 s ». */
export function formaterDuree(secondes) {
  const n = nombre(secondes);
  return n === null ? TIRET : `${n.toFixed(1).replace(".", ",")} s`;
}

/** Fenêtre de pause en millisecondes, tronquée : 133.33 → « 133 ms ». */
export function formaterFenetre(ms) {
  const n = nombre(ms);
  return n === null ? TIRET : `${Math.trunc(n)} ms`;
}

/** Les deux champs de la ligne d'infos, à partir d'un résultat de `calculerRoulette`. */
export function formaterInfos(r) {
  return {
    duree: formaterDuree(r?.duree),
    fenetre: formaterFenetre(r?.fenetrePauseMs),
  };
}
