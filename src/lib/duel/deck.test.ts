import { describe, expect, it } from "vitest";
import { CARTES } from "@/data/cartes";
import { getPiece } from "@/data/pieces";
import { statsDuel } from "@/data/duel/cartesDuel";
import { creerRng } from "@/lib/duel/rng";
import { validerDeck } from "@/lib/duel/deck";
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
  it("bicolore : au moins 14 cartes des deux catégories", () => {
    const d = deckBicolore(creerRng(3), "Musique", "Mode");
    expect(d.filter((id) => ["Musique", "Mode"].includes(getPiece(id)!.serie)).length).toBeGreaterThanOrEqual(14);
  });
  it("courbe : agressif ⇒ coûts ≤ 3, contrôle ⇒ coûts ≥ 3", () => {
    expect(deckCourbe(creerRng(1), "agressif").every((id) => statsDuel(id).cout <= 3)).toBe(true);
    expect(deckCourbe(creerRng(1), "controle").every((id) => statsDuel(id).cout >= 3)).toBe(true);
  });
});
