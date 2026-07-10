import { describe, expect, it } from "vitest";
import { volumeVinylForPos, fireplaceVolumeForPos } from "./audioCurves";

describe("audioCurves (panorama bureau 3 zones)", () => {
  it("vinyle : 0.3 au bureau (0), 0.5 à la porte (1), pic 0.8 au repos (2)", () => {
    expect(volumeVinylForPos(0)).toBeCloseTo(0.3); // bureau
    expect(volumeVinylForPos(1)).toBeCloseTo(0.5); // porte
    expect(volumeVinylForPos(2)).toBeCloseTo(0.8); // repos (gramophone)
    // Interpolation continue entre zones.
    expect(volumeVinylForPos(0.5)).toBeCloseTo(0.4);
    expect(volumeVinylForPos(1.5)).toBeCloseTo(0.65);
  });

  it("cheminée : nulle au bureau, pic 0.6 au repos", () => {
    expect(fireplaceVolumeForPos(0)).toBe(0); // bureau
    expect(fireplaceVolumeForPos(1)).toBeCloseTo(0.3); // porte
    expect(fireplaceVolumeForPos(2)).toBeCloseTo(0.6); // repos
  });

  it("reste borné hors domaine (robustesse overscroll)", () => {
    expect(volumeVinylForPos(-0.3)).toBeGreaterThanOrEqual(0.3 - 0.2 * 0.3);
    expect(volumeVinylForPos(2.4)).toBeLessThanOrEqual(0.8);
    expect(fireplaceVolumeForPos(-0.3)).toBe(0);
    expect(fireplaceVolumeForPos(2.4)).toBeLessThanOrEqual(0.6);
  });
});
