import { describe, expect, it } from "vitest";
import { BAZAR_LAYOUT, CLES_LOTS, CLE_VITRINE, type BazarObjetKey } from "./bazarLayout";
import { qgPct } from "@/components/mobile/qg/layout";

describe("BAZAR_LAYOUT", () => {
  it("porte les neuf cases de l'étagère et les quatre emplacements du décor", () => {
    const cles = Object.keys(BAZAR_LAYOUT.objets) as BazarObjetKey[];
    expect(cles.sort()).toEqual(
      [
        "case1", "case2", "case3",
        "case4", "case5", "case6",
        "case7", "case8", "case9",
        "borne", "porte", "table", "vendeur",
      ].sort(),
    );
  });

  it("désigne la rangée du bas pour les lots et le centre pour l'objet de la semaine", () => {
    expect(CLES_LOTS).toEqual(["case7", "case8", "case9"]);
    expect(CLE_VITRINE).toBe("case5");
  });

  it("utilise le même repère que le QG (300vw), sinon l'outil de calage ment", () => {
    expect(BAZAR_LAYOUT.panoramaWidth).toBe(300);
    expect(qgPct(150)).toBe(50);
  });

  it("range la grille de gauche à droite et de haut en bas", () => {
    const o = BAZAR_LAYOUT.objets;
    // Trois colonnes : même ordre horizontal sur chaque rangée.
    for (const [g, c, d] of [
      ["case1", "case2", "case3"],
      ["case4", "case5", "case6"],
      ["case7", "case8", "case9"],
    ] as const) {
      expect(o[g].left).toBeLessThan(o[c].left);
      expect(o[c].left).toBeLessThan(o[d].left);
    }
    // Trois rangées : la première est la plus haute (bottom décroît vers le bas).
    expect(o.case1.bottom).toBeGreaterThan(o.case4.bottom);
    expect(o.case4.bottom).toBeGreaterThan(o.case7.bottom);
  });

  it("garde les neuf cases dans la zone du comptoir, loin des frontières de swipe", () => {
    // Zone centre = 33 %..66 % de 300vw = 100vw..200vw. Une case qui déborde
    // serait coupée en deux par le snap.
    for (const cle of ["case1", "case5", "case9"] as const) {
      const c = BAZAR_LAYOUT.objets[cle];
      expect(qgPct(c.left)).toBeGreaterThan(33);
      expect(qgPct(c.left + c.width)).toBeLessThan(66);
    }
  });
});
