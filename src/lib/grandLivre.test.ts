import { describe, expect, it } from "vitest";
import { appendLedger, reconstruireGrandLivre } from "./grandLivre";
import { createMockGameState } from "./__test-fixtures__/gameState";
import type { SessionChinage, SessionVente } from "@/types/game";

describe("appendLedger", () => {
  it("ajoute une entrée au grand livre et mute le budget par défaut", () => {
    const state = createMockGameState({ budget: 1000 });
    const next = appendLedger(state, {
      jour: 5,
      kind: "gazette",
      designation: "Gazette du jour 5",
      recette: 0,
      depense: 12,
    });
    expect(next.budget).toBe(988);
    expect(next.grandLivre).toHaveLength(1);
    expect(next.grandLivre[0]).toMatchObject({
      jour: 5,
      kind: "gazette",
      depense: 12,
      recette: 0,
      soldeApres: 988,
    });
    expect(typeof next.grandLivre[0].id).toBe("string");
    expect(typeof next.grandLivre[0].timestamp).toBe("number");
  });

  it("avec applyBudget=false : ajoute l'entrée sans toucher au budget", () => {
    const state = createMockGameState({ budget: 1000 });
    const next = appendLedger(
      state,
      {
        jour: 3,
        kind: "session_chinage",
        designation: "Brocante test · 2 acquis",
        recette: 0,
        depense: 50,
        sessionId: "sess-1",
      },
      { applyBudget: false },
    );
    expect(next.budget).toBe(1000);
    expect(next.grandLivre[0].soldeApres).toBe(1000);
    expect(next.grandLivre[0].sessionId).toBe("sess-1");
  });

  it("recette positive crédite le budget", () => {
    const state = createMockGameState({ budget: 100 });
    const next = appendLedger(state, {
      jour: 1,
      kind: "courrier_recompense",
      designation: "Lettre de la mère",
      recette: 150,
      depense: 0,
      courrierId: "c-1",
    });
    expect(next.budget).toBe(250);
    expect(next.grandLivre[0].soldeApres).toBe(250);
    expect(next.grandLivre[0].courrierId).toBe("c-1");
  });
});

describe("reconstruireGrandLivre", () => {
  it("retourne [] pour un historique vide", () => {
    expect(reconstruireGrandLivre([], 1000)).toEqual([]);
  });

  it("crée une entrée par SessionChinage avec depense = total achats", () => {
    const sess: SessionChinage = {
      id: "s1",
      type: "chinage",
      jour: 2,
      timestamp: 1000,
      brocanteId: "broc-1",
      brocanteNom: "Brocante du Lac",
      achats: [
        { templateId: "legacy", nom: "A", categorie: "Musique", etat: "Bon", prixReferenceReel: 30, prixPaye: 20 },
        { templateId: "legacy", nom: "B", categorie: "Musique", etat: "Bon", prixReferenceReel: 50, prixPaye: 30 },
      ],
      xpGagne: {},
    };
    const out = reconstruireGrandLivre([sess], 950);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "session_chinage",
      depense: 50,
      recette: 0,
      sessionId: "s1",
      jour: 2,
    });
    expect(out[0].designation).toContain("Brocante du Lac");
    expect(out[0].soldeApres).toBe(950);
  });

  it("crée une entrée par SessionVente avec recette = total ventes brutes", () => {
    const sess: SessionVente = {
      id: "s2",
      type: "vente",
      jour: 3,
      timestamp: 2000,
      niveauCamion: 1,
      loyer: 0,
      ventes: [
        { templateId: "legacy", nom: "X", categorie: "Mode", etat: "Bon", prixReferenceReel: 100, prixVente: 80, prixAchat: 20 },
        { templateId: "legacy", nom: "Y", categorie: "Mode", etat: "Bon", prixReferenceReel: 60, prixVente: 50, prixAchat: 10 },
      ],
      invendus: 0,
      xpGagne: {},
    };
    const out = reconstruireGrandLivre([sess], 1130);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "session_vente",
      depense: 0,
      recette: 130,
      sessionId: "s2",
    });
  });

  it("trie chronologiquement (plus ancien en premier) et calcule soldeApres en remontant", () => {
    const s1: SessionChinage = {
      id: "s1", type: "chinage", jour: 1, timestamp: 1000,
      brocanteId: "b", brocanteNom: "B",
      achats: [{ templateId: "legacy", nom: "A", categorie: "Musique", etat: "Bon", prixReferenceReel: 0, prixPaye: 30 }],
      xpGagne: {},
    };
    const s2: SessionVente = {
      id: "s2", type: "vente", jour: 2, timestamp: 2000,
      niveauCamion: 1, loyer: 0,
      ventes: [{ templateId: "legacy", nom: "X", categorie: "Mode", etat: "Bon", prixReferenceReel: 0, prixVente: 80, prixAchat: 0 }],
      invendus: 0,
      xpGagne: {},
    };
    // L'historique du jeu stocke "plus récent en premier" — on passe les deux ordres.
    const out = reconstruireGrandLivre([s2, s1], 1050);
    // Ordre chrono ascendant : s1 puis s2.
    expect(out.map((e) => e.sessionId)).toEqual(["s1", "s2"]);
    // soldeApres : on remonte depuis 1050 (état courant).
    // Après s2 (vente 80) : 1050. Donc avant s2 = 970. Après s1 (depense 30) = 970. Avant s1 = 1000.
    expect(out[0].soldeApres).toBe(970); // après s1
    expect(out[1].soldeApres).toBe(1050); // après s2
  });
});
