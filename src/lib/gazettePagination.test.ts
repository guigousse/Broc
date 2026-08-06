import { describe, expect, it } from "vitest";
import { indicesValides, paginerSections } from "@/lib/gazettePagination";

describe("paginerSections", () => {
  it("tout tient sur une page", () => {
    expect(paginerSections([100, 150, 80], 400)).toEqual([[0, 1, 2]]);
  });

  it("déborde → la section qui ne rentre plus ouvre la page suivante", () => {
    expect(paginerSections([200, 150, 120], 400)).toEqual([[0, 1], [2]]);
  });

  it("une section plus haute qu'une page obtient sa page dédiée", () => {
    expect(paginerSections([500, 100], 400)).toEqual([[0], [1]]);
    // Même géante en milieu de liste, et la suivante repart sur une page neuve
    expect(paginerSections([100, 500, 100], 400)).toEqual([[0], [1], [2]]);
  });

  it("jamais de page vide : liste vide → une seule page vide", () => {
    expect(paginerSections([], 400)).toEqual([[]]);
  });

  it("hauteurs nulles (jsdom) → tout sur une page", () => {
    expect(paginerSections([0, 0, 0], 400)).toEqual([[0, 1, 2]]);
  });

  it("hauteurDisponible non positive → tout sur une page (garde-fou)", () => {
    expect(paginerSections([100, 100], 0)).toEqual([[0, 1]]);
  });
});

describe("indicesValides", () => {
  it("filtre les indices devenus obsolètes (section disparue)", () => {
    // Page mesurée quand il y avait 4 sections (ex. encart braderie présent) ;
    // la composition s'est réduite à 3 sections avant le prochain repaint.
    expect(indicesValides([1, 2, 3], 3)).toEqual([1, 2]);
  });

  it("page intacte si tous les indices restent valides", () => {
    expect(indicesValides([0, 1], 3)).toEqual([0, 1]);
  });

  it("liste vide → liste vide", () => {
    expect(indicesValides([], 0)).toEqual([]);
  });
});
