/** Nombre de slots de restauration par niveau d'atelier (= niveau). Une
 *  nouvelle partie démarre à 0 : chaque slot s'achète (cf. ATELIER_UPGRADES). */
export const ATELIER_SLOTS: Record<0 | 1 | 2 | 3, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
};

export interface AtelierUpgrade {
  niveauActuel: 0 | 1 | 2;
  niveauCible: 1 | 2 | 3;
  cout: number;
}

export const ATELIER_UPGRADES: readonly AtelierUpgrade[] = [
  { niveauActuel: 0, niveauCible: 1, cout: 100 },
  { niveauActuel: 1, niveauCible: 2, cout: 200 },
  { niveauActuel: 2, niveauCible: 3, cout: 500 },
] as const;

export function getProchaineUpgrade(
  niveau: 0 | 1 | 2 | 3,
): AtelierUpgrade | null {
  return ATELIER_UPGRADES.find((u) => u.niveauActuel === niveau) ?? null;
}

export function getCapaciteAtelier(niveau: 0 | 1 | 2 | 3): number {
  return ATELIER_SLOTS[niveau];
}
