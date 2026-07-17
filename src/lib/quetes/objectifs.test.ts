import { describe, expect, it } from "vitest";
import {
  missionLivrable,
  objectifsDeMission,
  progressionObjectif,
} from "./objectifs";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { CourrierPayloadMission, MissionResolution, SessionVente } from "@/types/game";

const payloadBase: CourrierPayloadMission = {
  type: "mission", categorie: "principale", expediteurId: "grand-pere",
  titre: "t", corps: [], cibles: [], recompense: { argent: 10 },
};
const reso: MissionResolution = { courrierId: "x", statut: "active", timestampAcceptation: 1000 };

function venteSession(timestamp: number, ventes: Array<{ prixVente: number; prixAchat: number | null }>): SessionVente {
  return {
    id: `s${timestamp}`, type: "vente", jour: 3, timestamp, niveauCamion: 1,
    loyer: 0, invendus: 0, xpGagne: {} as SessionVente["xpGagne"],
    ventes: ventes.map((v) => ({
      templateId: "ma.x", nom: "X", categorie: "Maison",
      etat: "Bon", prixReferenceReel: 10, ...v,
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
