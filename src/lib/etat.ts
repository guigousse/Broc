import type { EtatObjet } from "@/types/game";

export const FACTEUR_ETAT: Record<EtatObjet, number> = {
  Mauvais: 0.3,
  Bon: 0.6,
  "Très bon": 1,
  "Pristin état": 1.4,
};

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
