export interface StockageTier {
  niveau: 1 | 2 | 3 | 4;
  nom: string;
  /** Borne haute incluse — quand `nbObjets <= capaciteMax`, on est dans ce tier. */
  capaciteMax: number;
  /** Loyer prélevé chaque fin de semaine. */
  loyerHebdo: number;
}

/**
 * Tiers de stockage, déterminés automatiquement par la taille de l'inventaire.
 * Le joueur ne choisit pas son tier — il subit le coût correspondant au volume
 * qu'il accumule. Tenir un Hangar coûte cher : il faut vendre régulièrement.
 */
export const STOCKAGE_TIERS: readonly StockageTier[] = [
  { niveau: 1, nom: "Garage", capaciteMax: 10, loyerHebdo: 30 },
  { niveau: 2, nom: "Cave aménagée", capaciteMax: 25, loyerHebdo: 70 },
  { niveau: 3, nom: "Hangar", capaciteMax: 50, loyerHebdo: 150 },
  { niveau: 4, nom: "Entrepôt", capaciteMax: Number.POSITIVE_INFINITY, loyerHebdo: 320 },
];

export function getStockageTier(nbObjets: number): StockageTier {
  for (const tier of STOCKAGE_TIERS) {
    if (nbObjets <= tier.capaciteMax) return tier;
  }
  return STOCKAGE_TIERS[STOCKAGE_TIERS.length - 1];
}
