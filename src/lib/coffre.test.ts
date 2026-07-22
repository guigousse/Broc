import { describe, it, expect } from "vitest";
import {
  bboxOverlap,
  capaciteSuffit,
  containRect,
  placesUtilisees,
} from "@/lib/coffre";
import type { TailleObjet } from "@/types/game";

describe("containRect — géométrie du masque alpha = géométrie du rendu", () => {
  it("image carrée : remplit le carré", () => {
    expect(containRect(500, 500, 48)).toEqual({ dw: 48, dh: 48 });
  });

  it("image haute (livre 375×545) : largeur réduite au ratio, pas étirée", () => {
    const { dw, dh } = containRect(375, 545, 48);
    expect(dh).toBe(48);
    expect(dw).toBeCloseTo(48 * (375 / 545), 5);
    // Le bug d'origine : dw valait 48 (étirement) → masque ~45 % trop large.
    expect(dw).toBeLessThan(48);
  });

  it("image large : hauteur réduite au ratio", () => {
    const { dw, dh } = containRect(800, 400, 48);
    expect(dw).toBe(48);
    expect(dh).toBe(24);
  });

  it("dimensions invalides : retombe sur le carré plein", () => {
    expect(containRect(0, 545, 48)).toEqual({ dw: 48, dh: 48 });
  });
});

describe("bboxOverlap", () => {
  it("rectangles disjoints", () => {
    expect(bboxOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 20, w: 5, h: 5 },
    )).toBe(false);
  });

  it("rectangles qui se touchent (bord à bord)", () => {
    expect(bboxOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 10, y: 0, w: 5, h: 5 },
    )).toBe(false);
  });

  it("rectangles qui se chevauchent", () => {
    expect(bboxOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 5, y: 5, w: 10, h: 10 },
    )).toBe(true);
  });
});

describe("placesUtilisees", () => {
  const items: ReadonlyArray<{ taille: TailleObjet }> = [
    { taille: "XS" }, { taille: "S" }, { taille: "M" },
  ];

  it("somme correctement les places", () => {
    // PLACES_PAR_TAILLE actuels : XS=0.75, S=1.00, M=1.50
    expect(placesUtilisees(items)).toBeCloseTo(0.75 + 1.00 + 1.50, 3);
  });
});

describe("capaciteSuffit", () => {
  it("9 places dispo, ajout 4 → ok", () => {
    expect(capaciteSuffit(5, 4, 9)).toBe(true);
  });
  it("9 places dispo, déjà 6 utilisées + 4 → refus", () => {
    expect(capaciteSuffit(6, 4, 9)).toBe(false);
  });
});
