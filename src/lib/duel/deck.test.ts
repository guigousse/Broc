import { describe, expect, it } from "vitest";
import { CARTES } from "@/data/cartes";
import { statsDuel } from "@/data/duel/cartesDuel";
import { creerRng } from "@/lib/duel/rng";
import { LEGENDAIRES_MAX, TAILLE_DECK, validerDeck } from "@/lib/duel/deck";
import { deckAleatoire, deckBicolore, deckCourbe } from "@/lib/duel/generateursDecks";

const LEG = CARTES.filter((c) => c.rarete === "legendaire").map((c) => c.id);
const COM = CARTES.filter((c) => c.rarete === "commun").map((c) => c.id);

describe("validerDeck", () => {
  it("accepte 20 cartes distinctes avec ≤ 2 légendaires", () => {
    expect(validerDeck([...LEG.slice(0, 2), ...COM.slice(0, 18)])).toEqual([]);
  });
  it("refuse taille, doublon, inconnue, 3 légendaires", () => {
    expect(validerDeck(COM.slice(0, 19))).toContain("taille");
    expect(validerDeck([COM[0], ...COM.slice(0, 19)])).toContain("doublon");
    expect(validerDeck(["carte.nimporte", ...COM.slice(0, 19)])).toContain("inconnue");
    expect(validerDeck([...LEG.slice(0, 3), ...COM.slice(0, 17)])).toContain("legendaires");
  });
});

describe("générateurs", () => {
  it("tous rendent des decks valides, déterministes par graine", () => {
    for (const gen of [
      (r: () => number) => deckAleatoire(r),
      (r: () => number) => deckBicolore(r, "Bricolage", "Maison"),
      (r: () => number) => deckCourbe(r, "agressif"),
      (r: () => number) => deckCourbe(r, "controle"),
    ]) {
      const d1 = gen(creerRng(5)), d2 = gen(creerRng(5));
      expect(validerDeck(d1)).toEqual([]);
      expect(d1).toEqual(d2);
    }
  });
  it("bicolore : contient toutes les cartes des deux catégories, hors légendaires au-delà du plafond", () => {
    for (const [a, b] of [
      ["Bricolage", "Maison"],
      ["Objets d'art", "Mode"],
    ] as const) {
      const pairCards = CARTES.filter((c) => c.serie === a || c.serie === b);
      // Précondition de la garantie testée : la paire ne comporte pas plus de légendaires que le plafond.
      expect(pairCards.filter((c) => c.rarete === "legendaire").length).toBeLessThanOrEqual(LEGENDAIRES_MAX);
      const d = deckBicolore(creerRng(3), a, b);
      const dansLaPaire = (id: string) => pairCards.some((c) => c.id === id);
      expect(d.filter(dansLaPaire).length).toBe(Math.min(TAILLE_DECK, pairCards.length));
    }
  });
  it("courbe : agressif ⇒ coûts ≤ 3, contrôle ⇒ coûts ≥ 3", () => {
    expect(deckCourbe(creerRng(1), "agressif").every((id) => statsDuel(id).cout <= 3)).toBe(true);
    expect(deckCourbe(creerRng(1), "controle").every((id) => statsDuel(id).cout >= 3)).toBe(true);
  });
});
