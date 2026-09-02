import { describe, expect, it } from "vitest";
import { CARTES } from "@/data/cartes";
import { campagne, formaterRapport, horsCible } from "@/lib/duel/campagne";

describe("campagne", () => {
  it("mesure 120 parties : toutes les cartes vues, taux bornés, rapport formaté", () => {
    const m = campagne({ graine: 1, nParties: 120 });
    expect(m.parties).toBe(120);
    expect(Object.keys(m.cartes)).toHaveLength(CARTES.length);
    for (const c of Object.values(m.cartes)) expect(c.victoires).toBeLessThanOrEqual(c.parties);
    expect(m.premierJoueur).toBeGreaterThanOrEqual(0);
    expect(m.premierJoueur).toBeLessThanOrEqual(1);
    expect(Object.keys(m.categories)).toHaveLength(7);
    const texte = formaterRapport(m, 1);
    expect(texte).toContain("| Carte |");
    expect(Array.isArray(horsCible(m))).toBe(true);
  });

  it("est déterministe", () => {
    expect(campagne({ graine: 4, nParties: 30 })).toEqual(campagne({ graine: 4, nParties: 30 }));
  });
});
