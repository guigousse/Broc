import type { StandConfig, StandLevel } from "@/types/game";

export const STAND_LEVELS: readonly StandConfig[] = [
  {
    niveau: 1,
    nom: "Petit étal",
    capaciteMin: 1,
    capaciteMax: 10,
    loyer: 15,
  },
  {
    niveau: 2,
    nom: "Stand standard",
    capaciteMin: 11,
    capaciteMax: 25,
    loyer: 40,
  },
  {
    niveau: 3,
    nom: "Grand stand",
    capaciteMin: 26,
    capaciteMax: 50,
    loyer: 90,
  },
];

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

export const CAPACITE_MAX_GLOBALE = STAND_LEVELS[STAND_LEVELS.length - 1].capaciteMax;
