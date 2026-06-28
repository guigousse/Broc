import { describe, expect, it } from "vitest";
import { volumeVinylForPos, fireplaceVolumeForPos } from "./audioCurves";

describe("audioCurves (panorama 9 zones)", () => {
  it("vinyle : faible dans la Collection (0..2), pic au repos (idx 5)", () => {
    expect(volumeVinylForPos(0)).toBeCloseTo(0.3); // lecture
    expect(volumeVinylForPos(1)).toBeCloseTo(0.3); // vitrine
    expect(volumeVinylForPos(3)).toBeCloseTo(0.3); // bureau
    expect(volumeVinylForPos(5)).toBeCloseTo(0.8); // repos (gramophone)
    expect(volumeVinylForPos(6)).toBeCloseTo(0.4); // stockage
    expect(volumeVinylForPos(8)).toBeGreaterThanOrEqual(0.2); // coinL plancher
  });

  it("cheminée : nulle hors bureau, pic au repos (idx 5)", () => {
    expect(fireplaceVolumeForPos(0)).toBe(0); // collection
    expect(fireplaceVolumeForPos(3)).toBeCloseTo(0); // bureau gauche
    expect(fireplaceVolumeForPos(5)).toBeCloseTo(0.6); // repos
    expect(fireplaceVolumeForPos(8)).toBe(0); // atelier
  });
});
