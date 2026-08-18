import { describe, expect, it } from "vitest";
import {
  missionLivrable,
  missionsLivrables,
  objectifsDeMission,
  progressionObjectif,
} from "./objectifs";
import { createMockGameState, createMockObjet } from "@/lib/__test-fixtures__/gameState";
import type {
  CategorieObjet,
  Courrier,
  CourrierPayloadMission,
  MissionResolution,
  SessionChinage,
  SessionVente,
} from "@/types/game";

const payloadBase: CourrierPayloadMission = {
  type: "mission", categorie: "principale", expediteurId: "grand-pere",
  titre: "t", corps: [], cibles: [], recompense: { argent: 10 },
};
const reso: MissionResolution = { courrierId: "x", statut: "active", timestampAcceptation: 1000 };

function venteSession(
  timestamp: number,
  ventes: Array<{ prixVente: number; prixAchat: number | null; categorie?: CategorieObjet }>,
): SessionVente {
  return {
    id: `s${timestamp}`, type: "vente", jour: 3, timestamp, niveauCamion: 1,
    loyer: 0, invendus: 0, xpGagne: {} as SessionVente["xpGagne"],
    ventes: ventes.map((v) => ({
      templateId: "ma.x", nom: "X", categorie: "Maison",
      etat: "Bon", prixReferenceReel: 10, ...v,
    })),
  };
}

function chineSession(timestamp: number, templateIds: string[]): SessionChinage {
  return {
    id: `c${timestamp}`, type: "chinage", jour: 3, timestamp,
    brocanteId: "b1", brocanteNom: "B", xpGagne: {} as SessionChinage["xpGagne"],
    achats: templateIds.map((templateId) => ({
      templateId, nom: "X", categorie: "Musique" as const,
      etat: "Bon" as const, prixReferenceReel: 10, prixPaye: 5,
    })),
  };
}

describe("objectifsDeMission", () => {
  it("dérive des cibles quand objectifs absent", () => {
    const p = { ...payloadBase, cibles: [{ templateId: "ma.a", etatMin: "Bon" as const }] };
    expect(objectifsDeMission(p)).toEqual([{ type: "objet", templateId: "ma.a", etatMin: "Bon" }]);
  });
  it("retourne objectifs quand présent", () => {
    const p = { ...payloadBase, objectifs: [{ type: "ventesCumulees" as const, montant: 300 }] };
    expect(objectifsDeMission(p)).toEqual([{ type: "ventesCumulees", montant: 300 }]);
  });
});

describe("progressionObjectif", () => {
  it("ventesCumulees : somme les ventes strictement après l'acceptation", () => {
    const state = createMockGameState({
      historique: [
        venteSession(500, [{ prixVente: 100, prixAchat: 10 }]),  // avant acceptation
        venteSession(2000, [{ prixVente: 120, prixAchat: 10 }, { prixVente: 60, prixAchat: null }]),
      ],
    });
    const p = progressionObjectif({ type: "ventesCumulees", montant: 300 }, state, reso, 1);
    expect(p).toEqual({ actuel: 180, cible: 300, atteint: false });
  });
  it("profitVente : meilleur profit d'une seule vente après acceptation (prixAchat null ignoré)", () => {
    const state = createMockGameState({
      historique: [venteSession(2000, [
        { prixVente: 150, prixAchat: 40 },   // profit 110
        { prixVente: 500, prixAchat: null }, // ignoré
      ])],
    });
    const p = progressionObjectif({ type: "profitVente", montant: 100 }, state, reso, 1);
    expect(p).toEqual({ actuel: 110, cible: 100, atteint: true });
  });
  it("restauration : atteint si une restauration post-acceptation atteint l'état min", () => {
    const state = createMockGameState({
      restaurations: [
        { timestamp: 500, etatFinal: "Pristin état" },  // avant
        { timestamp: 2000, etatFinal: "Très bon" },
      ],
    });
    expect(progressionObjectif({ type: "restauration", etatMin: "Très bon" }, state, reso, 1).atteint).toBe(true);
    expect(progressionObjectif({ type: "restauration", etatMin: "Pristin état" }, state, reso, 1).atteint).toBe(false);
  });
  it("valeurCollection et niveau : lus en direct sur l'état", () => {
    const state = createMockGameState({});
    state.brocanteur.niveau = 7;
    const n = progressionObjectif({ type: "niveau", niveau: 8 }, state, reso, 1);
    expect(n).toEqual({ actuel: 7, cible: 8, atteint: false });
    const v = progressionObjectif({ type: "valeurCollection", montant: 5000 }, state, reso, 1);
    expect(v.cible).toBe(5000);
    expect(v.atteint).toBe(v.actuel >= 5000);
  });
  it("objet : possession dans l'inventaire (0/1)", () => {
    const state = createMockGameState({});
    const avant = progressionObjectif({ type: "objet", templateId: "ma.zz" }, state, reso, 1);
    expect(avant).toEqual({ actuel: 0, cible: 1, atteint: false });
  });
  it("fallback sans timestampAcceptation : borne par jourRecu (sessions jour >= jourRecu)", () => {
    const state = createMockGameState({
      historique: [venteSession(2000, [{ prixVente: 120, prixAchat: 10 }])], // jour 3
    });
    const sansTs: MissionResolution = { courrierId: "x", statut: "active" };
    expect(progressionObjectif({ type: "ventesCumulees", montant: 300 }, state, sansTs, 4).actuel).toBe(0);
    expect(progressionObjectif({ type: "ventesCumulees", montant: 300 }, state, sansTs, 3).actuel).toBe(120);
  });
});

describe("missionsLivrables", () => {
  const courrierCh2: Courrier = {
    id: "trame_ch2", type: "mission", jourRecu: 1, lu: true,
    payload: { ...payloadBase, objectifs: [{ type: "ventesCumulees", montant: 300 }] },
  };

  it("mission à objectif seul NON atteint : pas livrable (régression badge grand-père)", () => {
    const state = createMockGameState({
      courriers: [courrierCh2],
      missions: [{ courrierId: "trame_ch2", statut: "active", timestampAcceptation: 1000 }],
    });
    expect(missionsLivrables(state)).toEqual([]);
  });

  it("objectif atteint : livrable avec l'expéditeur ; mission livrée exclue", () => {
    const state = createMockGameState({
      courriers: [courrierCh2],
      missions: [{ courrierId: "trame_ch2", statut: "active", timestampAcceptation: 1000 }],
      historique: [venteSession(2000, [{ prixVente: 350, prixAchat: 10 }])],
    });
    expect(missionsLivrables(state)).toEqual([
      { courrierId: "trame_ch2", expediteurId: "grand-pere" },
    ]);
    const livree = createMockGameState({
      courriers: [courrierCh2],
      missions: [{ courrierId: "trame_ch2", statut: "livree", timestampAcceptation: 1000 }],
      historique: [venteSession(2000, [{ prixVente: 350, prixAchat: 10 }])],
    });
    expect(missionsLivrables(livree)).toEqual([]);
  });
});

describe("missionLivrable", () => {
  it("narrative (aucun objectif) : livrable immédiatement", () => {
    expect(missionLivrable(payloadBase, reso, createMockGameState({}), 1)).toBe(true);
  });
  it("mixte : exige cibles possédées ET objectifs non-objet atteints", () => {
    const p = { ...payloadBase, objectifs: [{ type: "ventesCumulees" as const, montant: 300 }] };
    const state = createMockGameState({ historique: [venteSession(2000, [{ prixVente: 350, prixAchat: 10 }])] });
    expect(missionLivrable(p, reso, state, 1)).toBe(true);
    expect(missionLivrable(p, reso, createMockGameState({}), 1)).toBe(false);
  });
});

describe("objetsRares", () => {
  const obj = { type: "objetsRares" as const, nombre: 2 };

  it("compte les objets rares chinés après l'acceptation", () => {
    const state = createMockGameState({
      historique: [
        chineSession(500, ["mus.guitare_classique_ancienne"]), // avant acceptation
        chineSession(1500, ["mus.guitare_classique_ancienne", "mus.33tours_jazz_1"]),
        chineSession(2500, ["mus.test_pressing_des_trolling_sons"]),
      ],
    });
    expect(progressionObjectif(obj, state, reso, 1)).toEqual({ actuel: 2, cible: 2, atteint: true });
  });

  it("ce qui précède l'acceptation ne compte pas", () => {
    const state = createMockGameState({
      historique: [chineSession(500, ["mus.guitare_classique_ancienne", "mus.test_pressing_des_trolling_sons"])],
    });
    expect(progressionObjectif(obj, state, reso, 1)).toEqual({ actuel: 0, cible: 2, atteint: false });
  });

  it("le stock déjà possédé ne compte pas", () => {
    const state = createMockGameState({
      historique: [],
      inventaireJoueur: [createMockObjet({ templateId: "mus.guitare_classique_ancienne", categorie: "Musique" })],
    });
    expect(progressionObjectif(obj, state, reso, 1).actuel).toBe(0);
  });
});

describe("beneficeCumule", () => {
  const obj = { type: "beneficeCumule" as const, montant: 300 };

  it("somme les marges des ventes postérieures", () => {
    const state = createMockGameState({
      historique: [venteSession(1500, [{ prixVente: 200, prixAchat: 50 }, { prixVente: 100, prixAchat: 40 }])],
    });
    expect(progressionObjectif(obj, state, reso, 1)).toEqual({ actuel: 210, cible: 300, atteint: false });
  });

  it("ignore les ventes sans prix d'achat connu", () => {
    const state = createMockGameState({
      historique: [venteSession(1500, [{ prixVente: 500, prixAchat: null }, { prixVente: 100, prixAchat: 40 }])],
    });
    expect(progressionObjectif(obj, state, reso, 1).actuel).toBe(60);
  });

  it("une perte nette ne descend pas sous zéro", () => {
    const state = createMockGameState({
      historique: [venteSession(1500, [{ prixVente: 10, prixAchat: 200 }])],
    });
    expect(progressionObjectif(obj, state, reso, 1).actuel).toBe(0);
  });
});

describe("ventesCategorie", () => {
  const obj = { type: "ventesCategorie" as const, categorie: "Musique" as const, nombre: 3 };

  it("ne compte que la catégorie demandée", () => {
    const state = createMockGameState({
      historique: [
        venteSession(1500, [
          { prixVente: 10, prixAchat: 5, categorie: "Musique" },
          { prixVente: 10, prixAchat: 5, categorie: "Musique" },
          { prixVente: 10, prixAchat: 5, categorie: "Mode" },
        ]),
      ],
    });
    expect(progressionObjectif(obj, state, reso, 1)).toEqual({ actuel: 2, cible: 3, atteint: false });
  });
});
