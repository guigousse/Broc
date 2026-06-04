import { describe, expect, it } from "vitest";
import {
  NOM_ARCHETYPE,
  calculerPrixMinAcceptDepuisPersona,
  tirerPersonaVendeur,
} from "./personas";
import { createMockBrocante } from "./__test-fixtures__/gameState";

describe("NOM_ARCHETYPE", () => {
  it("a une entrée par archétype vendeur", () => {
    expect(NOM_ARCHETYPE.naif).toBeTruthy();
    expect(NOM_ARCHETYPE.bonhomme).toBeTruthy();
    expect(NOM_ARCHETYPE.mamie).toBeTruthy();
    expect(NOM_ARCHETYPE.malin).toBeTruthy();
    expect(NOM_ARCHETYPE.grincheux).toBeTruthy();
    expect(NOM_ARCHETYPE.antiquaire).toBeTruthy();
  });

  it("tous les noms sont distincts", () => {
    const noms = new Set(Object.values(NOM_ARCHETYPE));
    expect(noms.size).toBe(Object.keys(NOM_ARCHETYPE).length);
  });
});

describe("tirerPersonaVendeur — structure", () => {
  it("retourne un NegoPersona valide pour brocante=undefined", () => {
    const p = tirerPersonaVendeur(undefined);
    expect(p.archetype).toBeTruthy();
    expect(p.margePct).toBeGreaterThanOrEqual(0);
    expect(p.margePct).toBeLessThanOrEqual(1);
    expect(p.elanPct).toBeGreaterThanOrEqual(0);
    expect(p.elanPct).toBeLessThanOrEqual(1);
    expect(p.patience).toBeGreaterThanOrEqual(2);
    expect(p.tolerancePct).toBeGreaterThanOrEqual(0);
    expect(p.tolerancePct).toBeLessThanOrEqual(1);
    expect(p.sangFroid).toBeGreaterThanOrEqual(0);
    expect(p.sangFroid).toBeLessThanOrEqual(1);
  });

  it("patience est un entier >= 2", () => {
    for (let i = 0; i < 20; i++) {
      const p = tirerPersonaVendeur(undefined);
      expect(Number.isInteger(p.patience)).toBe(true);
      expect(p.patience).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("tirerPersonaVendeur — tier 4 favorise antiquaire", () => {
  it("sur 50 tirages tier 4, l'antiquaire est majoritaire", () => {
    const broc = createMockBrocante({ tier: 4, etoiles: 4 });
    const counts: Record<string, number> = {};
    for (let i = 0; i < 50; i++) {
      const p = tirerPersonaVendeur(broc);
      counts[p.archetype] = (counts[p.archetype] ?? 0) + 1;
    }
    const antiquaire = counts.antiquaire ?? 0;
    expect(antiquaire).toBeGreaterThanOrEqual(20); // ~60% attendu
  });
});

describe("tirerPersonaVendeur — tier 1 jamais antiquaire", () => {
  it("sur 100 tirages tier 1 sans ambiance, antiquaire ne sort pas (poids 0)", () => {
    const broc = createMockBrocante({ tier: 1, etoiles: 1, ambiance: "" });
    for (let i = 0; i < 100; i++) {
      const p = tirerPersonaVendeur(broc);
      expect(p.archetype).not.toBe("antiquaire");
    }
  });
});

describe("calculerPrixMinAcceptDepuisPersona", () => {
  it("prix min = prixVendeur × (1 - margePct)", () => {
    expect(
      calculerPrixMinAcceptDepuisPersona(
        {
          archetype: "test",
          margePct: 0.2,
          elanPct: 0.3,
          patience: 5,
          tolerancePct: 0.2,
          sangFroid: 0.5,
        },
        100,
      ),
    ).toBe(80);
  });

  it("ne descend jamais sous 1", () => {
    expect(
      calculerPrixMinAcceptDepuisPersona(
        {
          archetype: "test",
          margePct: 1, // 100% de marge
          elanPct: 0,
          patience: 5,
          tolerancePct: 0,
          sangFroid: 0,
        },
        50,
      ),
    ).toBeGreaterThanOrEqual(1);
  });

  it("retourne un entier", () => {
    const p = calculerPrixMinAcceptDepuisPersona(
      {
        archetype: "test",
        margePct: 0.37,
        elanPct: 0.3,
        patience: 5,
        tolerancePct: 0.2,
        sangFroid: 0.5,
      },
      137,
    );
    expect(Number.isInteger(p)).toBe(true);
  });
});
