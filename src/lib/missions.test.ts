import { describe, expect, it } from "vitest";
import {
  progressionMission,
  estMissionLivrable,
  indicesAConsommerPourLivraison,
} from "./missions";
import type { CourrierPayloadMission, Objet } from "@/types/game";

function obj(patch: Partial<Objet>): Objet {
  return {
    id: Math.random().toString(36).slice(2),
    templateId: "x",
    nom: "X",
    categorie: "Musique",
    prixReferenceReel: 10,
    etat: "Bon",
    ...patch,
  } as Objet;
}

function mission(cibles: CourrierPayloadMission["cibles"]): CourrierPayloadMission {
  return {
    type: "mission",
    categorie: "secondaire",
    expediteurId: "maman",
    titre: "T",
    corps: [],
    cibles,
    recompense: { argent: 10 },
  };
}

describe("progressionMission", () => {
  it("0/n quand aucun objet ne correspond", () => {
    const p = progressionMission(mission([{ templateId: "a" }, { templateId: "b" }]), []);
    expect(p.remplies).toBe(0);
    expect(p.total).toBe(2);
    expect(p.livrable).toBe(false);
    expect(p.ciblesRemplies).toEqual([false, false]);
  });

  it("compte une cible remplie si l'état est suffisant", () => {
    const inv = [obj({ templateId: "a", etat: "Très bon" })];
    const p = progressionMission(mission([{ templateId: "a", etatMin: "Bon" }]), inv);
    expect(p.remplies).toBe(1);
    expect(p.livrable).toBe(true);
  });

  it("ignore un objet en restauration", () => {
    const inv = [obj({ templateId: "a", enRestauration: { etatCible: "Très bon", debutMs: 0, finMs: 99 } })];
    const p = progressionMission(mission([{ templateId: "a" }]), inv);
    expect(p.remplies).toBe(0);
  });

  it("exige deux objets distincts si deux cibles partagent le templateId", () => {
    const un = [obj({ templateId: "a" })];
    const deux = [obj({ templateId: "a" }), obj({ templateId: "a" })];
    expect(progressionMission(mission([{ templateId: "a" }, { templateId: "a" }]), un).remplies).toBe(1);
    expect(progressionMission(mission([{ templateId: "a" }, { templateId: "a" }]), deux).livrable).toBe(true);
  });
});

describe("indicesAConsommerPourLivraison", () => {
  it("retourne null si non livrable", () => {
    expect(indicesAConsommerPourLivraison(mission([{ templateId: "a" }]), [])).toBeNull();
  });

  it("consomme le moins bon état d'abord", () => {
    const inv = [
      obj({ templateId: "a", etat: "Très bon" }), // idx 0
      obj({ templateId: "a", etat: "Bon" }),       // idx 1 (le moins bon)
    ];
    const idx = indicesAConsommerPourLivraison(mission([{ templateId: "a", etatMin: "Bon" }]), inv);
    expect(idx).toEqual([1]);
  });

  it("réserve des objets distincts pour des cibles identiques", () => {
    const inv = [obj({ templateId: "a", etat: "Bon" }), obj({ templateId: "a", etat: "Très bon" })];
    const idx = indicesAConsommerPourLivraison(mission([{ templateId: "a" }, { templateId: "a" }]), inv);
    expect([...idx!].sort()).toEqual([0, 1]);
  });
});

describe("estMissionLivrable (compat)", () => {
  it("reste un booléen dérivé de la progression", () => {
    const inv = [obj({ templateId: "a" })];
    expect(estMissionLivrable(mission([{ templateId: "a" }]), inv)).toBe(true);
    expect(estMissionLivrable(mission([{ templateId: "a" }, { templateId: "b" }]), inv)).toBe(false);
  });
});
