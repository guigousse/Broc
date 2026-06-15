import { describe, expect, it } from "vitest";
import {
  getCapaciteStockage,
  placeRestante,
  stockageEstPlein,
  totalEnStock,
} from "./stockage";
import {
  createMockGameState,
  createMockObjet,
} from "./__test-fixtures__/gameState";

describe("totalEnStock", () => {
  it("compte uniquement l'inventaire si aucune vitrine", () => {
    const state = createMockGameState({
      inventaireJoueur: [createMockObjet(), createMockObjet()],
      vitrine: null,
    });
    expect(totalEnStock(state)).toBe(2);
  });

  it("ajoute les objets en vitrine", () => {
    const state = createMockGameState({
      inventaireJoueur: [createMockObjet(), createMockObjet()],
      vitrine: {
        brocanteId: "b1",
        objets: [
          { objet: createMockObjet(), prixVente: 100 },
          { objet: createMockObjet(), prixVente: 100 },
          { objet: createMockObjet(), prixVente: 100 },
        ],
      },
    });
    expect(totalEnStock(state)).toBe(5);
  });

  it("retourne 0 si tout est vide", () => {
    const state = createMockGameState();
    expect(totalEnStock(state)).toBe(0);
  });
});

describe("getCapaciteStockage", () => {
  it("retourne une capacité > 0 pour chaque niveau", () => {
    for (const niveau of [1, 2, 3] as const) {
      const state = createMockGameState({ niveauStockage: niveau });
      expect(getCapaciteStockage(state)).toBeGreaterThan(0);
    }
  });

  it("la capacité croît avec le niveau", () => {
    const c1 = getCapaciteStockage(createMockGameState({ niveauStockage: 1 }));
    const c3 = getCapaciteStockage(createMockGameState({ niveauStockage: 3 }));
    expect(c3).toBeGreaterThan(c1);
  });
});

describe("stockageEstPlein", () => {
  it("false si vide", () => {
    expect(stockageEstPlein(createMockGameState())).toBe(false);
  });

  it("true si l'inventaire atteint la capacité", () => {
    const state0 = createMockGameState({ niveauStockage: 1 });
    const cap = getCapaciteStockage(state0);
    const inv = Array.from({ length: cap }, () => createMockObjet());
    const state = createMockGameState({
      niveauStockage: 1,
      inventaireJoueur: inv,
    });
    expect(stockageEstPlein(state)).toBe(true);
  });
});

describe("placeRestante", () => {
  it("retourne capacité - total quand il reste de la place", () => {
    const state0 = createMockGameState({ niveauStockage: 1 });
    const cap = getCapaciteStockage(state0);
    const state = createMockGameState({
      niveauStockage: 1,
      inventaireJoueur: [createMockObjet(), createMockObjet()],
    });
    expect(placeRestante(state)).toBe(cap - 2);
  });

  it("ne descend jamais en-dessous de 0 (sur-remplissage clampé)", () => {
    const state0 = createMockGameState({ niveauStockage: 1 });
    const cap = getCapaciteStockage(state0);
    const inv = Array.from({ length: cap + 10 }, () => createMockObjet());
    const state = createMockGameState({
      niveauStockage: 1,
      inventaireJoueur: inv,
    });
    expect(placeRestante(state)).toBe(0);
  });
});
