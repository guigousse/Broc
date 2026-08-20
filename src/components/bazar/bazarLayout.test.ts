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
    // Le repère n'est PAS redéclaré côté Bazar : `qgPct` est la seule voie de
    // conversion, et elle divise par `QG_LAYOUT.panoramaWidth`.
    expect(QG_LAYOUT.panoramaWidth).toBe(300);
    expect(qgPct(150)).toBe(50);
    expect("panoramaWidth" in BAZAR_LAYOUT).toBe(false);
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

  it("garde CHAQUE emplacement entier dans une seule zone de swipe", () => {
    // Trois zones de 100vw : [0,100] arcade, [100,200] comptoir, [200,300]
    // antiquités. Un objet à cheval sur une frontière est coupé en deux par le
    // snap. Le garde couvre TOUTES les clés (pas seulement les cases) : c'est
    // la passe de calage à la souris qui va réécrire ces nombres à la main,
    // et rien d'autre ne la rattraperait.
    const cles = Object.keys(BAZAR_LAYOUT.objets) as BazarObjetKey[];
    for (const cle of cles) {
      const c = BAZAR_LAYOUT.objets[cle];
      const zoneGauche = Math.floor(c.left / 100);
      const zoneDroite = Math.floor((c.left + c.width) / 100);
      expect({ cle, zoneGauche, zoneDroite }).toEqual({
        cle,
        zoneGauche,
        zoneDroite: zoneGauche,
      });
      expect(c.left).toBeGreaterThanOrEqual(0);
      expect(c.left + c.width).toBeLessThanOrEqual(300);
    }
  });

  it("ne pose jamais deux emplacements l'un sur l'autre sur la même planche", () => {
    // Remplace un ancien test sans mordant (`cases.length <= utilisees.size * 2`,
    // soit 6 ≤ 8 : toujours vrai). Ce qui compte vraiment après le calage
    // manuel, c'est que deux articles d'une même planche ne se superposent pas.
    const cases = (Object.keys(BAZAR_LAYOUT.objets) as BazarObjetKey[]).filter((k) =>
      k.startsWith("case"),
    );
    for (const a of cases) {
      for (const b of cases) {
        if (a >= b) continue;
        const ca = BAZAR_LAYOUT.objets[a];
        const cb = BAZAR_LAYOUT.objets[b];
        if (ca.bottom !== cb.bottom) continue;
        const chevauche = ca.left < cb.left + cb.width && cb.left < ca.left + ca.width;
        expect({ paire: `${a}/${b}`, chevauche }).toEqual({ paire: `${a}/${b}`, chevauche: false });
      }
    }
  });

  it("les emplacements que la scène désigne existent bel et bien", () => {
    for (const cle of [...CLES_LOTS, CLE_VITRINE]) {
      expect(BAZAR_LAYOUT.objets[cle]).toBeDefined();
    }
  });
});
