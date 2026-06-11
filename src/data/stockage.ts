export interface StockageTier {
  niveau: 1 | 2 | 3 | 4;
  nom: string;
  capaciteMax: number;
  loyerHebdo: number;
}

export const STOCKAGE_TIERS: readonly StockageTier[] = [
  { niveau: 1, nom: "Garage", capaciteMax: 10, loyerHebdo: 0 },
  { niveau: 2, nom: "Cave", capaciteMax: 25, loyerHebdo: 0 },
  { niveau: 3, nom: "Hangar", capaciteMax: 50, loyerHebdo: 0 },
  { niveau: 4, nom: "Entrepôt", capaciteMax: 100, loyerHebdo: 0 },
];

export interface StockageUpgrade {
  niveauActuel: 1 | 2 | 3;
  niveauCible: 2 | 3 | 4;
  cout: number;
}

export const STOCKAGE_UPGRADES: readonly StockageUpgrade[] = [
  { niveauActuel: 1, niveauCible: 2, cout: 100 },
  { niveauActuel: 2, niveauCible: 3, cout: 250 },
  { niveauActuel: 3, niveauCible: 4, cout: 500 },
] as const;

export function getStockageTier(nbObjets: number): StockageTier {
  for (const tier of STOCKAGE_TIERS) {
    if (nbObjets <= tier.capaciteMax) return tier;
  }
  return STOCKAGE_TIERS[STOCKAGE_TIERS.length - 1];
}

export function getStockageTierParNiveau(niveau: 1 | 2 | 3 | 4): StockageTier {
  return STOCKAGE_TIERS[niveau - 1];
}

export function getProchaineUpgradeStockage(
  niveau: 1 | 2 | 3 | 4,
): StockageUpgrade | null {
  if (niveau === 1) return STOCKAGE_UPGRADES[0];
  if (niveau === 2) return STOCKAGE_UPGRADES[1];
  if (niveau === 3) return STOCKAGE_UPGRADES[2];
  return null;
}
