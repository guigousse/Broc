import { describe, expect, it } from "vitest";
import {
  UNIFIED_ZONE_ORDER,
  UNIFIED_ZONE_OFFSETS,
  UNIFIED_PANORAMA_WIDTH_VW,
} from "./UnifiedPanorama";

describe("modèle de zones du panorama bureau", () => {
  it("ordonne les 3 zones gauche→droite", () => {
    expect(UNIFIED_ZONE_ORDER).toEqual(["bureau", "porte", "repos"]);
  });

  it("a des offsets 0/100/200 dans la largeur 300vw", () => {
    expect(UNIFIED_ZONE_OFFSETS).toEqual({ bureau: 0, porte: 100, repos: 200 });
    expect(UNIFIED_PANORAMA_WIDTH_VW).toBe(300);
  });
});
