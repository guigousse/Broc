import { getPiece } from "@/data/pieces";
import { CARTES_DUEL } from "@/data/duel/cartesDuel";

export const TAILLE_DECK = 20;
export const LEGENDAIRES_MAX = 2;

export function validerDeck(ids: readonly string[]): string[] {
  const raisons: string[] = [];
  if (ids.length !== TAILLE_DECK) raisons.push("taille");
  if (new Set(ids).size !== ids.length) raisons.push("doublon");
  if (ids.some((id) => !CARTES_DUEL[id])) raisons.push("inconnue");
  if (ids.filter((id) => getPiece(id)?.rarete === "legendaire").length > LEGENDAIRES_MAX) raisons.push("legendaires");
  return raisons;
}
