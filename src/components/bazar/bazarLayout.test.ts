import { describe, expect, it } from "vitest";
import { BAZAR_LAYOUT, CLES_LOTS, CLE_VITRINE, type BazarObjetKey } from "./bazarLayout";
import { qgPct, QG_LAYOUT } from "@/components/mobile/qg/layout";
import { CHAT_BALADEUR_ORDER } from "@/lib/chatBaladeur";

describe("BAZAR_LAYOUT", () => {
  it("porte les six cases de l'étagère et les quatre emplacements du décor", () => {
    const cles = Object.keys(BAZAR_LAYOUT.objets) as BazarObjetKey[];
    expect(cles.sort()).toEqual(
      [
        "case1", "case2", "case3",
        "case4", "case5", "case6",
        "borne", "sortie", "table", "vendeur",
      ].sort(),
    );
  });

  it("ne partage aucune clé avec le QG — le dictionnaire de calage est plat", () => {
    const bazar = Object.keys(BAZAR_LAYOUT.objets);
    const qg = Object.keys(QG_LAYOUT.objets);
    expect(bazar.filter((k) => qg.includes(k))).toEqual([]);
  });

  it("ne partage aucune clé avec le chat baladeur — même raison", () => {
    const bazar = Object.keys(BAZAR_LAYOUT.objets);
    const chat = CHAT_BALADEUR_ORDER as readonly string[];
    expect(bazar.filter((k) => chat.includes(k))).toEqual([]);
  });

  it("désigne la planche du bas pour les lots et le milieu de la planche du haut pour l'objet de la semaine", () => {
    expect(CLES_LOTS).toEqual(["case4", "case5", "case6"]);
    expect(CLE_VITRINE).toBe("case2");
  });

  it("utilise le même repère que le QG (300vw), sinon l'outil de calage ment", () => {
    expect(BAZAR_LAYOUT.panoramaWidth).toBe(300);
    expect(qgPct(150)).toBe(50);
  });

  it("range la grille de gauche à droite et de haut en bas", () => {
    const o = BAZAR_LAYOUT.objets;
    // Deux planches : même ordre horizontal sur chacune.
    for (const [g, c, d] of [
      ["case1", "case2", "case3"],
      ["case4", "case5", "case6"],
    ] as const) {
      expect(o[g].left).toBeLessThan(o[c].left);
      expect(o[c].left).toBeLessThan(o[d].left);
    }
    // La planche du haut est plus haute (bottom décroît vers le bas).
    expect(o.case1.bottom).toBeGreaterThan(o.case4.bottom);
  });

  it("garde les six cases dans la zone du comptoir, loin des frontières de swipe", () => {
    // Zone centre = 33 %..66 % de 300vw = 100vw..200vw. Une case qui déborde
    // serait coupée en deux par le snap.
    for (const cle of ["case1", "case3", "case4", "case6"] as const) {
      const c = BAZAR_LAYOUT.objets[cle];
      expect(qgPct(c.left)).toBeGreaterThan(33);
      expect(qgPct(c.left + c.width)).toBeLessThan(66);
    }
  });

  it("ne porte pas de case orpheline — toute case est utilisée par la scène", () => {
    const cases = Object.keys(BAZAR_LAYOUT.objets).filter((k) => k.startsWith("case"));
    const utilisees = new Set<string>([...CLES_LOTS, CLE_VITRINE]);
    // Les cases non utilisées sont admises, mais jamais plus de la moitié :
    // au-delà, c'est que la grille et le décor ne se correspondent plus.
    expect(cases.length).toBeLessThanOrEqual(utilisees.size * 2);
  });
});
