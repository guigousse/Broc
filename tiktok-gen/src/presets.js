/**
 * Préréglages nommés (localStorage). Aucune dépendance au DOM.
 *
 * Un préréglage = les réglages courants SANS ce qui est propre à une vidéo :
 * la sélection d'objets et la cible (on les rechoisit à chaque fois) et la
 * photo importée (data-URL de plusieurs Mo, qui ferait déborder le stockage).
 * Le fond choisi dans la liste, lui, en fait partie.
 */
import { normaliserReglages } from "./reglages.js";

export const CLE_PRESETS = "broc-tiktok-gen-presets";
export const CLES_EXCLUES = Object.freeze(["objets", "cible", "fondPerso"]);
const NOM_MAX = 40;

/** Ce qui est mémorisé d'un jeu de réglages. */
export function extrairePreset(reglages) {
  const out = {};
  for (const [k, v] of Object.entries(reglages)) if (!CLES_EXCLUES.includes(k)) out[k] = v;
  return out;
}

/** Applique un préréglage aux réglages courants : la sélection et la photo restent. */
export function appliquerPreset(reglages, preset) {
  const garde = {};
  for (const k of CLES_EXCLUES) garde[k] = reglages[k];
  // Un fond « perso » mémorisé sans photo n'a pas de sens : on retombe sur le fond courant.
  const p = { ...preset };
  if (p.fond === "perso" && !garde.fondPerso) p.fond = reglages.fond;
  return normaliserReglages({ ...reglages, ...p, ...garde });
}

/** Nom nettoyé (espaces, longueur) ou "" s'il ne reste rien. */
export function nettoyerNom(nom) {
  return String(nom ?? "").trim().replace(/\s+/g, " ").slice(0, NOM_MAX);
}

export function listerPresets(storage) {
  try {
    const brut = JSON.parse(storage.getItem(CLE_PRESETS) ?? "{}");
    return brut && typeof brut === "object" && !Array.isArray(brut) ? brut : {};
  } catch {
    return {};
  }
}

/** Noms triés (insensible à la casse et aux accents). */
export function nomsPresets(storage) {
  return Object.keys(listerPresets(storage)).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

/** Enregistre (ou remplace) ; renvoie le nom retenu, ou null si le nom est vide. */
export function sauverPreset(storage, nom, reglages) {
  const n = nettoyerNom(nom);
  if (!n) return null;
  const tous = listerPresets(storage);
  tous[n] = extrairePreset(reglages);
  storage.setItem(CLE_PRESETS, JSON.stringify(tous));
  return n;
}

export function chargerPreset(storage, nom) {
  return listerPresets(storage)[nom] ?? null;
}

export function supprimerPreset(storage, nom) {
  const tous = listerPresets(storage);
  if (!(nom in tous)) return false;
  delete tous[nom];
  storage.setItem(CLE_PRESETS, JSON.stringify(tous));
  return true;
}
