import { describe, expect, it } from "vitest";
import {
  CARTES_POSTALES,
  INTERVALLE_CARTES_POSTALES,
  cartePostaleParId,
} from "./cartesPostales";

describe("cartesPostales (données)", () => {
  it("intervalle de 10 jours entre deux cartes", () => {
    expect(INTERVALLE_CARTES_POSTALES).toBe(10);
  });

  it("chaque carte a une illustration webp sous /cartes-postales/", () => {
    for (const c of CARTES_POSTALES) {
      expect(c.illustration).toMatch(/^\/cartes-postales\/[a-z-]+\.webp$/);
    }
  });

  it("les 5 cartes ont cachet + couleur de timbre (ATHINA pour la 5ᵉ)", () => {
    for (const c of CARTES_POSTALES) {
      expect(c.cachet, c.id).toBeTruthy();
      expect(c.couleurTimbre, c.id).toMatch(/^#/);
    }
    const carte5 = CARTES_POSTALES[4];
    expect(carte5.id).toBe("carte_postale_5");
    expect(carte5.titre).toBe("Carte d'Athènes");
    expect(carte5.cachet).toBe("ATHINA");
  });

  it("cartePostaleParId retrouve une carte, undefined sinon", () => {
    expect(cartePostaleParId("carte_postale_3")?.titre).toBe("Carte de Marrakech");
    expect(cartePostaleParId("lettre_maman_debut")).toBeUndefined();
  });
});
