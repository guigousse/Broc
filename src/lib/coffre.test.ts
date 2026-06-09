import { describe, it, expect } from "vitest";
import {
  bboxOverlap,
  capaciteSuffit,
  placesUtilisees,
} from "@/lib/coffre";
import type { TailleObjet } from "@/types/game";

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
    // PLACES_PAR_TAILLE actuels : XS=1.10, S=1.86, M=3.15
    expect(placesUtilisees(items)).toBeCloseTo(1.10 + 1.86 + 3.15, 3);
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
