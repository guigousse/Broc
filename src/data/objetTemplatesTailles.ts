import type { TailleObjet } from "@/types/game";

/**
 * Overrides explicites de taille par templateId.
 * Tout ce qui n'est pas listé tombe sur le défaut par catégorie.
 * À enrichir progressivement à mesure que des items "sentent faux" en jeu.
 */
export const TAILLES_OVERRIDE: Record<string, TailleObjet> = {
  // --- XS : objets minuscules ---
  "mus.harmonica_hohner": "XS",
  "mus.diapason_acier": "XS",

  // --- L : objets manifestement encombrants ---
  "mus.tourne_disque_thorens": "L",
  "br.etabli_pliant_ancien": "L",
  "br.etabli_chene_atelier": "L",
  "jx.flipper_gottlieb_60s": "L",
  "ma.bibliotheque_louis_philippe": "L",

  // --- XL : pianos & gros mobilier ---
  "leg.mus.piano_pleyel_concert": "XL",
  "br.etabli_compagnonnage_xixe": "XL",
  "br.tour_a_bois_atelier": "XL",
  "leg.br.tour_holtzapffel_xixe": "XL",
};
