import { describe, expect, it } from "vitest";
import {
  UNIFIED_ZONE_ORDER,
  UNIFIED_ZONE_CENTER_FRACTION,
  ZONES_BUREAU,
  type UnifiedZoneKey,
} from "./UnifiedPanorama";

describe("modèle de zones du panorama bureau", () => {
  it("ordonne les 3 zones gauche→droite", () => {
    expect(UNIFIED_ZONE_ORDER).toEqual(["bureau", "porte", "repos"]);
  });

  it("centre chaque zone sur son tiers de l'image (1/6, 1/2, 5/6)", () => {
    expect(UNIFIED_ZONE_CENTER_FRACTION.bureau).toBeCloseTo(1 / 6, 10);
    expect(UNIFIED_ZONE_CENTER_FRACTION.porte).toBeCloseTo(1 / 2, 10);
    expect(UNIFIED_ZONE_CENTER_FRACTION.repos).toBeCloseTo(5 / 6, 10);
  });

  it("espace les centres de zones d'un tiers de la scène", () => {
    const c = UNIFIED_ZONE_CENTER_FRACTION;
    expect(c.porte - c.bureau).toBeCloseTo(1 / 3, 10);
    expect(c.repos - c.porte).toBeCloseTo(1 / 3, 10);
  });

  it("relie les deux écritures du même modèle — ZONES_BUREAU et l'ordre/centres nommés", () => {
    // Deux formes du même fait vivaient côte à côte sans lien : `(qg)/layout`
    // dérive son index de zone de UNIFIED_ZONE_ORDER, tandis que l'index émis
    // par `onZoneIndex` vient de la position dans `zones` (= ZONES_BUREAU).
    // Les faire diverger montait le mauvais tiers de la pièce, sans qu'un test
    // bronche.
    expect(ZONES_BUREAU.map((z) => z.key)).toEqual(UNIFIED_ZONE_ORDER);
    for (const z of ZONES_BUREAU) {
      expect(z.center).toBe(UNIFIED_ZONE_CENTER_FRACTION[z.key as UnifiedZoneKey]);
    }
  });
});
