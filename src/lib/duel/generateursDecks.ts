import { CARTES } from "@/data/cartes";
import { statsDuel } from "@/data/duel/cartesDuel";
import { melanger } from "@/lib/duel/rng";
import { LEGENDAIRES_MAX, TAILLE_DECK } from "@/lib/duel/deck";
import type { CategorieObjet } from "@/types/game";

/** Prend dans `prioritaires` puis `reste` (mélangés), en respectant la limite de légendaires. */
function composer(rng: () => number, prioritaires: string[], reste: string[]): string[] {
  const deck: string[] = [];
  let leg = 0;
  for (const id of [...melanger(prioritaires, rng), ...melanger(reste, rng)]) {
    if (deck.length >= TAILLE_DECK) break;
    const estLeg = CARTES.find((c) => c.id === id)!.rarete === "legendaire";
    if (estLeg && leg >= LEGENDAIRES_MAX) continue;
    if (estLeg) leg++;
    deck.push(id);
  }
  return deck;
}

const TOUTES = CARTES.map((c) => c.id);

export function deckAleatoire(rng: () => number): string[] {
  return composer(rng, [], TOUTES);
}

/**
 * Contient toutes les cartes des deux catégories `a`/`b`, sauf les légendaires au-delà de
 * `LEGENDAIRES_MAX` ; les emplacements restants (jusqu'à `TAILLE_DECK`) sont piochés au hasard
 * dans le reste du pool. Précondition non vérifiée à l'exécution : `a !== b` (la campagne ne
 * l'enfreint jamais).
 */
export function deckBicolore(rng: () => number, a: CategorieObjet, b: CategorieObjet): string[] {
  const dedans = CARTES.filter((c) => c.serie === a || c.serie === b).map((c) => c.id);
  return composer(rng, dedans, TOUTES.filter((id) => !dedans.includes(id)));
}

export function deckCourbe(rng: () => number, profil: "agressif" | "controle"): string[] {
  const pool = TOUTES.filter((id) => (profil === "agressif" ? statsDuel(id).cout <= 3 : statsDuel(id).cout >= 3));
  return composer(rng, pool, []);
}
