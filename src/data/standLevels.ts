import type { BrocanteTier, StandConfig, StandLevel } from "@/types/game";

export const STAND_LEVELS: readonly StandConfig[] = [
  {
    niveau: 1,
    nom: "Petit étal",
    capaciteMin: 1,
    capaciteMax: 10,
    loyer: 20,
  },
  {
    niveau: 2,
    nom: "Stand standard",
    capaciteMin: 11,
    capaciteMax: 25,
    loyer: 50,
  },
  {
    niveau: 3,
    nom: "Grand stand",
    capaciteMin: 26,
    capaciteMax: 50,
    loyer: 120,
  },
];

/**
 * Matrice de coût stand par tier de brocante × taille de stand.
 * Valeurs en euros par journée.
 */
export const COUTS_STAND: Record<BrocanteTier, Record<StandLevel, number>> = {
  1: { 1: 20, 2: 50, 3: 120 },
  2: { 1: 70, 2: 180, 3: 420 },
  3: { 1: 220, 2: 550, 3: 1300 },
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
