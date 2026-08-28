import { describe, expect, it } from "vitest";
import { planImages, FPS_VIDEO, audioSpecificConfig, instantsSousImages, SOUS_IMAGES } from "./encodeur.js";

describe("planImages", () => {
  it("60 images par seconde, dernière à duree − 1/fps, sans image de queue", () => {
    const p = planImages(6.7);
    expect(FPS_VIDEO).toBe(60);
    expect(p.nb).toBe(402);
    expect(p.images[0]).toEqual({ i: 0, t: 0, timestampUs: 0, cle: true });
    expect(p.images.at(-1).t).toBeCloseTo(6.7 - 1 / 60, 9);
    expect(p.dureeUs).toBe(6_700_000);
  });
  it("horodatages strictement croissants et régulièrement espacés", () => {
    const { images } = planImages(2);
    for (let i = 1; i < images.length; i++) {
      const d = images[i].timestampUs - images[i - 1].timestampUs;
      expect(d).toBeGreaterThanOrEqual(16_666); expect(d).toBeLessThanOrEqual(16_667);
    }
  });
  it("une image clé toutes les 2 s, la première comprise", () => {
    const { images } = planImages(5);
    expect(images.filter((x) => x.cle).map((x) => x.i)).toEqual([0, 120, 240]);
  });
  it("au moins une image, même pour une durée nulle", () => {
    expect(planImages(0).nb).toBe(1);
  });
});

describe("audioSpecificConfig", () => {
  it("AAC-LC 48 kHz mono = 0x11 0x88, 44,1 kHz stéréo = 0x12 0x10", () => {
    expect([...audioSpecificConfig(48000, 1)]).toEqual([0x11, 0x88]);
    expect([...audioSpecificConfig(44100, 2)]).toEqual([0x12, 0x10]);
  });
  it("refuse une fréquence hors table", () => expect(() => audioSpecificConfig(50000, 1)).toThrow());
});

describe("instantsSousImages", () => {
  it("instants centrés dans l'intervalle de l'image, tous dans [t, t + 1/fps)", () => {
    const t = 1 / 60;
    const xs = instantsSousImages(t);
    expect(xs).toHaveLength(SOUS_IMAGES);
    expect(xs[0]).toBeCloseTo(t + 0.5 / SOUS_IMAGES / 60, 12);
    expect(xs.at(-1)).toBeCloseTo(t + (SOUS_IMAGES - 0.5) / SOUS_IMAGES / 60, 12);
    for (const x of xs) { expect(x).toBeGreaterThanOrEqual(t); expect(x).toBeLessThan(t + 1 / 60); }
  });
});
