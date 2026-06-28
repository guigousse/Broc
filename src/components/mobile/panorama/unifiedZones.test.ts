import { describe, expect, it } from "vitest";
import {
  UNIFIED_ZONE_ORDER,
  UNIFIED_ZONE_OFFSETS,
  UNIFIED_PANORAMA_WIDTH_VW,
  zoneIndexToTab,
  type UnifiedZoneKey,
} from "./UnifiedPanorama";

describe("modèle de zones unifié", () => {
  it("ordonne les 9 zones gauche→droite, Collection en tête", () => {
    expect(UNIFIED_ZONE_ORDER).toEqual([
      "lecture",
      "vitrine",
      "escalier",
      "bureau",
      "porte",
      "repos",
      "stockage",
      "etabli",
      "coinL",
    ]);
  });

  it("a des offsets strictement croissants dans la largeur 900vw", () => {
    const offs = UNIFIED_ZONE_ORDER.map((z) => UNIFIED_ZONE_OFFSETS[z]);
    for (let i = 1; i < offs.length; i++) {
      expect(offs[i]).toBeGreaterThan(offs[i - 1]);
    }
    expect(offs[0]).toBeGreaterThanOrEqual(0);
    expect(offs[offs.length - 1]).toBeLessThan(UNIFIED_PANORAMA_WIDTH_VW);
  });

  it("place la section Collection (offsets < 300) avant le bureau (>= 300)", () => {
    for (const z of ["lecture", "vitrine", "escalier"] as UnifiedZoneKey[]) {
      expect(UNIFIED_ZONE_OFFSETS[z]).toBeLessThan(300);
    }
    for (const z of ["bureau", "porte", "repos"] as UnifiedZoneKey[]) {
      expect(UNIFIED_ZONE_OFFSETS[z]).toBeGreaterThanOrEqual(300);
    }
    for (const z of ["stockage", "etabli", "coinL"] as UnifiedZoneKey[]) {
      expect(UNIFIED_ZONE_OFFSETS[z]).toBeGreaterThanOrEqual(600);
    }
  });

  it("mappe l'index de zone vers le bon onglet", () => {
    // 0,1,2 = collection ; 3,4,5 = bureau ; 6 = stockage ; 7,8 = atelier
    expect([0, 1, 2].map(zoneIndexToTab)).toEqual([
      "collection",
      "collection",
      "collection",
    ]);
    expect([3, 4, 5].map(zoneIndexToTab)).toEqual([
      "bureau",
      "bureau",
      "bureau",
    ]);
    expect(zoneIndexToTab(6)).toBe("stockage");
    expect([7, 8].map(zoneIndexToTab)).toEqual(["atelier", "atelier"]);
  });
});
