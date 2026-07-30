import { describe, expect, it } from "vitest";
import { CHEMINS, DUREES, MODELES, TARIFS } from "./config.mjs";

describe("config des reels", () => {
  it("place toutes les sorties sous marketing/, jamais sous public/", () => {
    for (const cle of ["masters", "sorties", "musique"]) {
      expect(CHEMINS[cle]).toContain("/marketing/reels");
      expect(CHEMINS[cle]).not.toContain("/public/");
    }
    expect(CHEMINS.sorties).toContain("/marketing/reels/out");
    expect(CHEMINS.masters).toContain("/marketing/reels/master");
  });

  it("expose les trois paliers vidéo et le modèle image", () => {
    expect(MODELES.video.lite).toBe("veo-3.1-lite-generate-preview");
    expect(MODELES.video.fast).toBe("veo-3.1-fast-generate-preview");
    expect(MODELES.video.pro).toBe("veo-3.1-generate-preview");
    expect(MODELES.image.pro).toBe("gemini-3-pro-image");
  });

  it("tarifie les trois paliers en 720p et 1080p", () => {
    expect(TARIFS.lite["720p"]).toBe(0.05);
    expect(TARIFS.fast["1080p"]).toBe(0.12);
    expect(TARIFS.pro["1080p"]).toBe(0.4);
  });

  it("fixe deux plans de 8 s et une carte de fin de 2 s", () => {
    expect(DUREES.plan).toBe(8);
    expect(DUREES.plans).toBe(2);
    expect(DUREES.carteFin).toBe(2);
  });
});
