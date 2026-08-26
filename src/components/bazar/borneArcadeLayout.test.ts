import { describe, expect, it } from "vitest";
import {
  BORNE_FACADE,
  PART_AIR_AU_DESSUS,
  PART_LARGEUR_CAISSON,
  dimensionnerBorne,
} from "./borneArcadeLayout";

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
  // Sur un téléphone c'est la LARGEUR qui commande, et le caisson ENTIER doit y
  // tenir : l'auteur est revenu le 2026-08-23 sur l'autorisation de déborder
  // qu'il avait donnée. Une borne dont les flancs sortent du cadre ne se lit
  // plus comme un meuble posé dans la boutique.
  it("sur un téléphone, fait tenir le caisson entier dans la largeur", () => {
    const { w, h } = dimensionnerBorne({ w: 393, h: 760 });
    expect(w).toBeLessThanOrEqual(393);
    expect(w).toBeCloseTo(393 * PART_LARGEUR_CAISSON, 0);
    expect(h).toBeLessThanOrEqual(760);
  });

  // La garde qui compte, et sur les gabarits réels : rien ne dépasse, jamais,
  // ni en largeur ni en hauteur. C'est tout ce que le cadrage promet.
  it("tient dans le cadre sur tous les gabarits, du plus étroit à la tablette", () => {
    const gabarits = [
      { w: 320, h: 480 }, // iPhone SE 1ʳᵉ génération, le plus étroit qu'on vise
      { w: 375, h: 667 },
      { w: 390, h: 735 }, // iPhone 12, cadre du Bazar mesuré
      { w: 430, h: 800 },
      { w: 834, h: 1000 }, // iPad portrait
      { w: 1200, h: 500 }, // large et court
    ];
    for (const g of gabarits) {
      const { w, h, top } = dimensionnerBorne(g);
      expect(w).toBeLessThanOrEqual(g.w + 0.01);
      expect(top + h).toBeLessThanOrEqual(g.h + 0.01);
    }
  });

  // Sur un écran large et court, c'est la hauteur qui commande — la largeur y
  // est si généreuse que s'y caler ferait sortir le marquee et le pupitre.
  it("sur un écran large et court, cale le caisson sur la hauteur", () => {
    const dispo = { w: 1200, h: 500 };
    const { w, h, top } = dimensionnerBorne(dispo);
    // La hauteur qui compte est celle qui RESTE sous l'air du haut.
    expect(h).toBeCloseTo(500 * (1 - PART_AIR_AU_DESSUS), 0);
    expect(w).toBeCloseTo(h * BORNE_FACADE.ratio, 0);
    // Et le socle est alors nul : le caisson touche déjà le bas.
    expect(top + h).toBeCloseTo(dispo.h, 0);
  });

  // ——— L'air du haut et le socle, ajoutés le 2026-08-23 ———

  it("laisse toujours la même part d'air au-dessus du marquee", () => {
    for (const dispo of [{ w: 320, h: 464 }, { w: 390, h: 735 }, { w: 834, h: 984 }]) {
      const { top } = dimensionnerBorne(dispo);
      expect(top).toBeCloseTo(dispo.h * PART_AIR_AU_DESSUS, 3);
    }
  });

  // LA garde du socle : il comble EXACTEMENT ce qui reste, donc jamais de trou
  // entre la base du meuble et la barre d'onglets, quel que soit le gabarit.
  it("ne laisse jamais de vide entre la base du caisson et le bas du cadre", () => {
    const gabarits = [
      { w: 320, h: 464 },
      { w: 375, h: 562 },
      { w: 390, h: 735 },
      { w: 430, h: 812 },
      { w: 834, h: 984 },
      { w: 1200, h: 500 },
      { w: 1200, h: 300 },
    ];
    for (const g of gabarits) {
      const { w, h, top } = dimensionnerBorne(g);
      const socle = g.h - top - h;
      expect(socle).toBeGreaterThanOrEqual(-0.01); // jamais négatif : rien n'est rogné
      expect(w).toBeLessThanOrEqual(g.w + 0.01);
      expect(top + h + socle).toBeCloseTo(g.h, 3);
    }
  });

  it("ne rend pas de socle négatif sur une place absurde", () => {
    const { w, h, top } = dimensionnerBorne({ w: 0, h: 0 });
    expect([w, h, top]).toEqual([0, 0, 0]);
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
