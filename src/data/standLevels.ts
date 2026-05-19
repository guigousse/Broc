import type { BrocanteTier, StandConfig, StandLevel } from "@/types/game";

export const STAND_LEVELS: readonly StandConfig[] = [
  {
    niveau: 1,
    nom: "Petit étal",
    capaciteMin: 1,
    capaciteMax: 10,
    loyer: 5,
  },
  {
    niveau: 2,
    nom: "Stand standard",
    capaciteMin: 11,
    capaciteMax: 25,
    loyer: 10,
  },
  {
    niveau: 3,
    nom: "Grand stand",
    capaciteMin: 26,
    capaciteMax: 50,
    loyer: 15,
  },
];

/**
 * Matrice de coût stand par tier de brocante × taille de stand.
 * Bases par tier : T1 5 €, T2 20 €, T3 60 €, T4 200 €.
 * À l'intérieur d'un tier : le stand moyen vaut ×2, le grand ×3.
 * Valeurs en euros par journée.
 */
export const COUTS_STAND: Record<BrocanteTier, Record<StandLevel, number>> = {
  1: { 1: 5, 2: 10, 3: 15 },
  2: { 1: 20, 2: 40, 3: 60 },
  3: { 1: 60, 2: 120, 3: 180 },
  4: { 1: 200, 2: 400, 3: 600 },
};

export function niveauRequis(nbObjets: number): StandConfig | null {
  return (
    STAND_LEVELS.find(
      (s) => nbObjets >= s.capaciteMin && nbObjets <= s.capaciteMax,
    ) ?? null
  );
}

export function configParNiveau(niveau: StandLevel): StandConfig {
  const c = STAND_LEVELS.find((s) => s.niveau === niveau);
  if (!c) throw new Error(`Stand niveau ${niveau} inconnu`);
  return c;
}

/** Coût d'un stand pour un tier de brocante donné et un niveau (taille) de stand. */
export function coutStand(tier: BrocanteTier, niveau: StandLevel): number {
  return COUTS_STAND[tier][niveau];
}

export const CAPACITE_MAX_GLOBALE = STAND_LEVELS[STAND_LEVELS.length - 1].capaciteMax;
