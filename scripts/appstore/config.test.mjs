import { describe, expect, it } from "vitest";
import { APPAREILS, BROCANTE_CHINE, BROCANTE_DEMO, CHEMINS, LANGUES, VISUELS } from "./config.mjs";

describe("config des visuels App Store", () => {
  it("écrit ses sorties sous marketing/, jamais sous public/", () => {
    expect(CHEMINS.sorties).toContain("/marketing/appstore");
    expect(CHEMINS.sorties).not.toContain("/public/");
    expect(CHEMINS.captures).toContain("/marketing/appstore");
  });

  it("cible les quatre langues de la fiche", () => {
    expect(LANGUES).toEqual(["fr", "en", "es", "el"]);
  });

  it("fixe les dimensions natives exigées par App Store Connect", () => {
    expect(APPAREILS.iphone.sortie).toEqual({ width: 1242, height: 2688 });
    expect(APPAREILS.ipad.sortie).toEqual({ width: 2064, height: 2752 });
  });

  it("dérive chaque sortie du viewport et de la densité", () => {
    for (const a of Object.values(APPAREILS)) {
      expect(a.viewport.width * a.densite).toBe(a.sortie.width);
      expect(a.viewport.height * a.densite).toBe(a.sortie.height);
    }
  });

  it("donne une grille 4×4 sur iPhone et 5×4 sur iPad", () => {
    expect(APPAREILS.iphone.grille).toEqual({ colonnes: 4, lignes: 4 });
    expect(APPAREILS.ipad.grille).toEqual({ colonnes: 5, lignes: 4 });
  });

  it("décrit cinq visuels, seul le dernier sans route ni ancre", () => {
    expect(VISUELS).toHaveLength(5);
    expect(VISUELS.map((v) => v.cle)).toEqual([
      "chiner", "negocier", "vendre", "collection", "personnages",
    ]);
    for (const v of VISUELS.slice(0, 4)) {
      expect(typeof v.route).toBe("function");
      expect(v.ancre).toMatch(/^img\[src\*=/);
    }
    expect(VISUELS[4].route).toBeNull();
    expect(VISUELS[4].ancre).toBeNull();
  });

  it("n'ouvre le tiroir de négociation que sur le visuel 2", () => {
    expect(VISUELS.filter((v) => v.ouvrirNego).map((v) => v.n)).toEqual([2]);
  });

  it("donne une expression de grand-père différente aux visuels 1 à 4", () => {
    const e = VISUELS.slice(0, 4).map((v) => v.expression);
    expect(new Set(e).size).toBe(4);
  });

  it("route sur la brocante armée dans la sauvegarde de démo", () => {
    // La vitrine est celle armée par gen-save-demo.ts ; le chinage se fait sur
    // une brocante de palier 3, dont le stock sort du commun.
    expect(BROCANTE_DEMO).toBe("marche-saint-ouen");
    expect(BROCANTE_CHINE).toBe("foire-chatou");
    expect(VISUELS[0].route()).toBe("/chiner/foire-chatou");
    expect(VISUELS[1].route()).toBe("/chiner/foire-chatou");
    expect(VISUELS[2].route()).toBe("/vitrine/marche-saint-ouen/journee");
  });
});
