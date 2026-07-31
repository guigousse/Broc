import { describe, it, expect } from "vitest";
import { DEBLOCAGES_PAR_NIVEAU, deblocagesPourNiveau, prochainDeblocage } from "./deblocagesNiveau";
import { NIVEAU_ACTIVES, NIVEAU_USAGE_2, NIVEAU_USAGE_3 } from "@/lib/actives";

describe("table des déblocages par niveau", () => {
  it("les jalons validés sont effectifs", () => {
    const effectifs = DEBLOCAGES_PAR_NIVEAU.filter((d) => d.effectif).map((d) => d.niveau).sort((a, b) => a - b);
    expect(effectifs).toEqual([
      1, 3, 5, 10, 10, 15, 20, 25, 30, 30, 35, 40, 45, 50, 55, 60,
      65, 70, 75, 80, 85, 90,
    ]);
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

  it("les lignes famille active couvrent déblocages + 2ᵉ + 3ᵉ usages", () => {
    const parNiveau = DEBLOCAGES_PAR_NIVEAU.filter((d) => d.famille === "active").map((d) => d.niveau).sort((a, b) => a - b);
    const attendus = [
      ...Object.values(NIVEAU_ACTIVES),
      ...Object.values(NIVEAU_USAGE_2),
      ...Object.values(NIVEAU_USAGE_3),
    ].sort((a, b) => a - b);
    expect(parNiveau).toEqual(attendus);
  });

  it("chaque ligne famille active porte son activeId (source du médaillon)", () => {
    const actives = DEBLOCAGES_PAR_NIVEAU.filter((d) => d.famille === "active");
    expect(actives).toHaveLength(18);
    for (const d of actives) expect(d.activeId).toBeTruthy();
    // 6 atouts × 3 occurrences (déblocage, 2ᵉ, 3ᵉ usage).
    const parId = new Map<string, number>();
    for (const d of actives) parId.set(d.activeId!, (parId.get(d.activeId!) ?? 0) + 1);
    expect([...parId.values()]).toEqual([3, 3, 3, 3, 3, 3]);
  });

  it("usageSupplementaire marque exactement les paliers 2ᵉ/3ᵉ usage", () => {
    const bonus = DEBLOCAGES_PAR_NIVEAU.filter((d) => d.usageSupplementaire);
    expect(bonus).toHaveLength(12);
    const niveauxBonus = bonus.map((d) => d.niveau).sort((a, b) => a - b);
    const attendus = [
      ...Object.values(NIVEAU_USAGE_2),
      ...Object.values(NIVEAU_USAGE_3),
    ].sort((a, b) => a - b);
    expect(niveauxBonus).toEqual(attendus);
    // Les déblocages initiaux (N5-30) n'ont pas le drapeau.
    for (const d of DEBLOCAGES_PAR_NIVEAU.filter((x) => x.famille === "active" && !x.usageSupplementaire)) {
      expect(Object.values(NIVEAU_USAGE_2)).not.toContain(d.niveau);
    }
    // Et aucune ligne hors famille active ne le porte.
    for (const d of DEBLOCAGES_PAR_NIVEAU.filter((x) => x.famille !== "active")) {
      expect(d.usageSupplementaire).toBeUndefined();
    }
  });
});
