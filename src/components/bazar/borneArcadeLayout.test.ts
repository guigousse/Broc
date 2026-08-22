import { describe, expect, it } from "vitest";
import { BORNE_FACADE, PART_LARGEUR_TROU, dimensionnerBorne } from "./borneArcadeLayout";

describe("BORNE_FACADE", () => {
  it("décrit un trou qui tient dans le caisson", () => {
    const { left, right, top, bottom } = BORNE_FACADE.trou;
    expect(left + right).toBeLessThan(100);
    expect(top + bottom).toBeLessThan(100);
    for (const v of [left, right, top, bottom]) expect(v).toBeGreaterThan(0);
  });

  it("laisse un trou de proportions 4:3 environ", () => {
    const { left, right, top, bottom } = BORNE_FACADE.trou;
    const l = (100 - left - right) / 100;
    const h = (100 - top - bottom) / 100;
    // largeur et hauteur du trou en px, sur un caisson de hauteur 1
    const ratio = (l * BORNE_FACADE.ratio) / h;
    expect(ratio).toBeGreaterThan(1.2);
    expect(ratio).toBeLessThan(1.5);
  });
});

describe("dimensionnerBorne", () => {
  // Sur un téléphone c'est la LARGEUR qui commande : le caisson déborde des
  // deux côtés, ce que l'auteur a explicitement autorisé — seul l'écran doit
  // être vu en entier.
  it("sur un téléphone, cale le trou sur la largeur et laisse le bois déborder", () => {
    const { w, h } = dimensionnerBorne({ w: 393, h: 760 });
    expect(w).toBeGreaterThan(393); // le caisson déborde
    expect(h).toBeLessThanOrEqual(760); // mais il tient en hauteur
    const largeurTrou = (w * (100 - BORNE_FACADE.trou.left - BORNE_FACADE.trou.right)) / 100;
    expect(largeurTrou).toBeCloseTo(393 * PART_LARGEUR_TROU, 0);
  });

  // Sur un écran large et court, c'est la hauteur qui commande, sinon le
  // marquee et le pupitre sortiraient du cadre et on ne reconnaîtrait plus
  // une borne.
  it("sur un écran large et court, cale le caisson sur la hauteur", () => {
    const { w, h } = dimensionnerBorne({ w: 1200, h: 500 });
    expect(h).toBeCloseTo(500, 0);
    expect(w).toBeCloseTo(500 * BORNE_FACADE.ratio, 0);
  });

  it("garde toujours le ratio du caisson", () => {
    for (const dispo of [{ w: 320, h: 600 }, { w: 393, h: 760 }, { w: 1024, h: 700 }]) {
      const { w, h } = dimensionnerBorne(dispo);
      expect(w / h).toBeCloseTo(BORNE_FACADE.ratio, 3);
    }
  });

  it("ne rend jamais de dimension nulle ou négative sur une place absurde", () => {
    const { w, h } = dimensionnerBorne({ w: 0, h: 0 });
    expect(w).toBe(0);
    expect(h).toBe(0);
  });
});
