import { describe, expect, it } from "vitest";
import {
  MAX_HISTORIQUE,
  ajouterSession,
  compterVentesParCategorie,
  cumulerVentes,
} from "./sessions";
import { createMockGameState } from "./__test-fixtures__/gameState";
import type { Session, SessionVente } from "@/types/game";

function venteSession(i: number, categorie = "Bricolage" as const): SessionVente {
  return {
    id: `v${i}`,
    type: "vente",
    jour: i + 1,
    timestamp: i,
    niveauCamion: 1,
    loyer: 0,
    ventes: [
      {
        nom: "Bidule",
        templateId: "legacy.bidule",
        categorie,
        etat: "Bon",
        prixReferenceReel: 100,
        prixVente: 80,
        prixAchat: 30,
      },
    ],
    invendus: 0,
    xpGagne: {},
  };
}

function chinageSession(i: number): Session {
  return {
    id: `c${i}`,
    type: "chinage",
    jour: i + 1,
    timestamp: i,
    brocanteId: "b",
    brocanteNom: "B",
    achats: [],
    xpGagne: {},
  };
}

describe("ajouterSession", () => {
  it("préprend la session et incrémente le compteur de ventes", () => {
    const state = createMockGameState({
      historique: [chinageSession(0)],
      ventesParCategorie: { Bricolage: 2 },
    });
    const next = ajouterSession(state, venteSession(1));
    expect(next.historique[0].id).toBe("v1");
    expect(next.historique).toHaveLength(2);
    expect(next.ventesParCategorie?.Bricolage).toBe(3);
  });

  it("une session de chinage ne touche pas au compteur", () => {
    const state = createMockGameState({
      historique: [],
      ventesParCategorie: { Bricolage: 2 },
    });
    const next = ajouterSession(state, chinageSession(1));
    expect(next.ventesParCategorie).toEqual({ Bricolage: 2 });
  });

  it("plafonne l'historique à MAX_HISTORIQUE (éviction en queue)", () => {
    const pleines = Array.from({ length: MAX_HISTORIQUE }, (_, i) =>
      chinageSession(i),
    );
    const state = createMockGameState({
      historique: pleines,
      ventesParCategorie: {},
    });
    const next = ajouterSession(state, venteSession(999));
    expect(next.historique).toHaveLength(MAX_HISTORIQUE);
    expect(next.historique[0].id).toBe("v999");
    // La plus ancienne (dernier élément) est évincée.
    expect(next.historique.some((s) => s.id === `c${MAX_HISTORIQUE - 1}`)).toBe(
      false,
    );
  });

  it("le compteur survit à l'éviction : le cumul reste exact", () => {
    let state = createMockGameState({ historique: [], ventesParCategorie: {} });
    for (let i = 0; i < MAX_HISTORIQUE + 30; i++) {
      state = ajouterSession(state, venteSession(i));
    }
    expect(state.historique).toHaveLength(MAX_HISTORIQUE);
    expect(state.ventesParCategorie?.Bricolage).toBe(MAX_HISTORIQUE + 30);
  });
});

describe("cumulerVentes / compterVentesParCategorie", () => {
  it("cumulerVentes est pur (ne mute pas l'entrée)", () => {
    const avant = { Bricolage: 1 };
    const apres = cumulerVentes(avant, venteSession(0));
    expect(avant).toEqual({ Bricolage: 1 });
    expect(apres).toEqual({ Bricolage: 2 });
  });

  it("compterVentesParCategorie agrège tout l'historique par catégorie", () => {
    const historique = [
      venteSession(0, "Bricolage"),
      venteSession(1, "Bricolage"),
      chinageSession(2),
    ];
    expect(compterVentesParCategorie(historique)).toEqual({ Bricolage: 2 });
  });
});
