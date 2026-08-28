/** Petits formatages de texte de l'interface. Fonctions pures, aucune dépendance au DOM. */
import { REGLAGES_DEFAUT, consigneParDefaut } from "./reglages.js";

const TIRET = "—";
const ELLIPSE = "…";

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

/**
 * Consigne « Mets pause sur … ! » garantie sous `max` caractères — la limite
 * du champ `#consigne`, au-delà de laquelle le bandeau du canvas condense le
 * texte. Si le nom complet ne tient pas, on ne garde que ses premiers mots
 * entiers, suivis d'une ellipse (et à défaut, on coupe dans le premier mot).
 */
export function consigneCourte(nom, max = 40) {
  const court = nomCourt(nom);
  if (!court) return REGLAGES_DEFAUT.consigne;
  const complete = consigneParDefaut(court);
  if (complete.length <= max) return complete;

  // Place laissée au nom une fois posé l'habillage « Mets pause sur  … ! ».
  const place = max - consigneParDefaut(` ${ELLIPSE}`).length;
  let retenu = "";
  for (const mot of court.split(" ")) {
    const essai = retenu ? `${retenu} ${mot}` : mot;
    if (essai.length > place) break;
    retenu = essai;
  }
  if (!retenu) retenu = court.slice(0, Math.max(0, place)).trimEnd();
  return consigneParDefaut(`${retenu} ${ELLIPSE}`);
}

/** Nombre exploitable, ou null : `Number(null)` vaut 0, ce qui masquerait une valeur absente. */
const nombre = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));

/** Durée en secondes, une décimale, virgule française : 12 → « 12,0 s ». */
/** « 5 € », « 1 200 € » : entier, espace fine insécable comme séparateur de milliers. */
export function formaterPrix(prix) {
  const n = Math.round(Number(prix) || 0);
  return `${n.toLocaleString("fr-FR").replace(/[\u202f\u00a0 ]/g, "\u202f")}\u202f€`;
}

export const MODELE_AUTRES_OBJETS = "+ {n} autres objets à collectionner dans le jeu";

/** Le modèle avec `{n}` remplacé par le nombre (« + 391 autres objets … »). Sans `{n}`, le texte tel quel. */
export function texteAutresObjets(nbAutres, modele = MODELE_AUTRES_OBJETS) {
  const n = Math.max(0, Math.round(Number(nbAutres) || 0));
  return String(modele ?? "").replaceAll("{n}", n.toLocaleString("fr-FR").replace(/[\u202f\u00a0 ]/g, "\u202f"));
}

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
