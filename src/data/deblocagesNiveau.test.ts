import { describe, it, expect } from "vitest";
import { DEBLOCAGES_PAR_NIVEAU, deblocagesPourNiveau, prochainDeblocage } from "./deblocagesNiveau";
import { NIVEAU_ACTIVES } from "@/lib/actives";

describe("table des déblocages par niveau", () => {
  it("les jalons validés sont effectifs", () => {
    const effectifs = DEBLOCAGES_PAR_NIVEAU.filter((d) => d.effectif).map((d) => d.niveau).sort((a, b) => a - b);
    expect(effectifs).toEqual([1, 3, 4, 5, 7, 9, 10, 10, 13, 15, 17, 20, 30]);
  });
  it("la table est triée par niveau (contrat de prochainDeblocage)", () => {
    const niveaux = DEBLOCAGES_PAR_NIVEAU.map((d) => d.niveau);
    for (let i = 1; i < niveaux.length; i++) {
      expect(niveaux[i]).toBeGreaterThanOrEqual(niveaux[i - 1]);
    }
  });
  it("prochainDeblocage retourne la première ligne strictement au-dessus", () => {
    expect(prochainDeblocage(4)!.niveau).toBe(5);
    expect(prochainDeblocage(99)).toBeNull();
  });
  it("le niveau 1 ouvre l'écran Compétences (effectif — onboarding)", () => {
    const l1 = deblocagesPourNiveau(1);
    expect(l1).toHaveLength(1);
    expect(l1[0].effectif).toBe(true);
    expect(l1[0].titre).toContain("Compétences");
  });

  it("les lignes famille active correspondent exactement à NIVEAU_ACTIVES", () => {
    const parNiveau = DEBLOCAGES_PAR_NIVEAU.filter((d) => d.famille === "active").map((d) => d.niveau).sort((a, b) => a - b);
    expect(parNiveau).toEqual(Object.values(NIVEAU_ACTIVES).sort((a, b) => a - b));
  });
});
