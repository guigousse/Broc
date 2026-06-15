export const ATELIER_SLOTS: Record<1 | 2 | 3, number> = {
  1: 1,
  2: 2,
  3: 3,
};

export interface AtelierUpgrade {
  niveauActuel: 1 | 2;
  niveauCible: 2 | 3;
  cout: number;
}

export const ATELIER_UPGRADES: readonly AtelierUpgrade[] = [
  { niveauActuel: 1, niveauCible: 2, cout: 200 },
  { niveauActuel: 2, niveauCible: 3, cout: 500 },
] as const;

export function getProchaineUpgrade(niveau: 1 | 2 | 3): AtelierUpgrade | null {
  if (niveau === 1) return ATELIER_UPGRADES[0];
  if (niveau === 2) return ATELIER_UPGRADES[1];
  return null;
}

export function getCapaciteAtelier(niveau: 1 | 2 | 3): number {
  return ATELIER_SLOTS[niveau];
}
