import { describe, expect, it } from "vitest";
import { filtrerCatalogue, tirerAleatoire, CATEGORIES } from "./catalogue.js";

const E = [
  { id: "a", nom: "Lampe Art déco", categorie: "Maison" },
  { id: "b", nom: "Vinyle", categorie: "Musique" },
  { id: "c", nom: "Lampe de bureau", categorie: "Maison" },
];

describe("filtrerCatalogue", () => {
  it("par catégorie", () => expect(filtrerCatalogue(E, { categorie: "Musique" }).map((e) => e.id)).toEqual(["b"]));
  it("par recherche sans accents ni casse", () => expect(filtrerCatalogue(E, { recherche: "LAMPE ART" }).map((e) => e.id)).toEqual(["a"]));
  it("sans filtre, tout", () => expect(filtrerCatalogue(E, {})).toHaveLength(3));
});

describe("tirerAleatoire", () => {
  it("n objets distincts, déterministe avec un aléa fixé", () => {
    const ids = tirerAleatoire(E, 2, () => 0.99).map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });
  it("plafonné à la taille du catalogue", () => expect(tirerAleatoire(E, 10, Math.random)).toHaveLength(3));
  it("n'échoue pas quand l'aléa vaut exactement 1", () => {
    const res = tirerAleatoire(E, 2, () => 1);
    expect(res).toHaveLength(2);
    for (const e of res) expect(e).toBeDefined();
    expect(new Set(res.map((e) => e.id)).size).toBe(2);
  });
});

it("7 catégories dans l'ordre du jeu", () => {
  expect(CATEGORIES[0]).toBe("Musique");
  expect(CATEGORIES).toHaveLength(7);
});
