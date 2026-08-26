/**
 * Réserve haute du contenu de la préparation du coffre.
 *
 * Défaut de recette (2026-08-26, étape de tutoriel « pose la carafe ») :
 * l'écran de packing est une colonne à hauteur fixe (`100dvh`,
 * `overflow: hidden`) dont la barre d'actions du bas est `position: fixed`.
 * Réserver la place de la bannière de consigne en haut du `<main>` n'y
 * décale pas la vue : cela ALLONGE le contenu, et le carrousel du stock —
 * dernier élément avant l'espaceur — glisse sous la barre. Mesuré au
 * navigateur : 73 px de carrousel sur 97 disparaissaient, la carafe à poser
 * devenait intapable.
 *
 * La bannière est `position: fixed` et transparente aux pointeurs : sur
 * l'image du coffre elle n'a rien à pousser, elle se superpose — comme le
 * texte d'étape (`EtapeBandeau`, lui aussi flottant) le fait déjà.
 * L'étape de tarification, elle, est une LISTE de lignes à prix : là, la
 * réserve reste nécessaire pour que la bannière ne morde pas la première.
 */
import { describe, it, expect } from "vitest";
import { reserveHauteContenuPrep } from "./vitrinePrep";

describe("reserveHauteContenuPrep", () => {
  it("packing : aucune réserve, la bannière se superpose à l'image du coffre", () => {
    expect(reserveHauteContenuPrep("packing")).toBe("0px");
  });

  it("packing : la hauteur de bannière n'entre JAMAIS dans le calcul — c'est elle qui poussait le carrousel sous la barre", () => {
    expect(reserveHauteContenuPrep("packing")).not.toContain("--tuto-banniere-h");
  });

  it("pricing : la réserve garde la première ligne à tarifer libre du texte d'étape et de la bannière", () => {
    expect(reserveHauteContenuPrep("pricing")).toBe(
      "calc(70px + var(--tuto-banniere-h, 0px))",
    );
  });
});
