import type { EtatObjet } from "@/types/game";

export const FACTEUR_ETAT: Record<EtatObjet, number> = {
  Mauvais: 0.3,
  Bon: 0.6,
  "Très bon": 1,
  "Pristin état": 1.4,
};

/** Nombre d'étoiles pleines par état (0 à 3). Source unique. */
export const ETAT_STARS: Record<EtatObjet, 0 | 1 | 2 | 3> = {
  Mauvais: 0,
  Bon: 1,
  "Très bon": 2,
  "Pristin état": 3,
};

/** Nombre maximum d'étoiles dans l'échelle d'état. */
export const ETAT_STARS_MAX = 3;

/** Étoiles pleines pour un état donné. `undefined` ⇒ 0. */
export function etoileCount(etat: EtatObjet | undefined): number {
  return etat ? ETAT_STARS[etat] : 0;
}

const ORDRE: readonly EtatObjet[] = [
  "Mauvais",
  "Bon",
  "Très bon",
  "Pristin état",
];

/** Renvoie l'état suivant (ou null si déjà au sommet). */
export function etatSuivant(etat: EtatObjet): EtatObjet | null {
  const i = ORDRE.indexOf(etat);
  if (i < 0 || i === ORDRE.length - 1) return null;
  return ORDRE[i + 1];
}

/** Recalcule le prix de référence pour un nouvel état (préserve la valeur de base). */
export function recalculerPrixReference(
  prixActuel: number,
  etatActuel: EtatObjet,
  etatCible: EtatObjet,
): number {
  const base = prixActuel / FACTEUR_ETAT[etatActuel];
  return Math.max(1, Math.round(base * FACTEUR_ETAT[etatCible]));
}
