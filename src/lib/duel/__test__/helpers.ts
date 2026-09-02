import { CARTES } from "@/data/cartes";

/** 20 premières / 20 suivantes du catalogue : deux decks singleton valides pour les tests. */
export const DECK_A = CARTES.slice(0, 20).map((c) => c.id);
export const DECK_B = CARTES.slice(20, 40).map((c) => c.id);
