import type { GameState } from "@/types/game";
import { getStockageTierParNiveau } from "@/data/stockage";

export function totalEnStock(state: GameState): number {
  return state.inventaireJoueur.length + (state.vitrine?.objets.length ?? 0);
}

export function getCapaciteStockage(state: GameState): number {
  return getStockageTierParNiveau(state.niveauStockage).capaciteMax;
}

export function stockageEstPlein(state: GameState): boolean {
  return totalEnStock(state) >= getCapaciteStockage(state);
}

export function placeRestante(state: GameState): number {
  return Math.max(0, getCapaciteStockage(state) - totalEnStock(state));
}
