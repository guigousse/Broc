import { describe, expect, it } from "vitest";
import {
  ETAPES_TUTORIEL,
  appliquerFinTutoriel,
  etapeSuivante,
  tutorielActif,
} from "./tutoriel";
import { ID_LETTRE_MAMAN_DEBUT } from "./courrier";
import { createMockGameState } from "./__test-fixtures__/gameState";

describe("tutoriel", () => {
  it("tutorielActif est vrai pour toute étape sauf 'termine'", () => {
    expect(tutorielActif({ tutorielEtape: "accueil" })).toBe(true);
    expect(tutorielActif({ tutorielEtape: "premiere-vente" })).toBe(true);
    expect(tutorielActif({ tutorielEtape: "termine" })).toBe(false);
  });

  it("etapeSuivante suit l'ordre linéaire et borne sur 'termine'", () => {
    expect(etapeSuivante("accueil")).toBe("aller-chiner");
    expect(etapeSuivante("conclusion")).toBe("termine");
    expect(etapeSuivante("termine")).toBe("termine");
  });

  it("ETAPES_TUTORIEL commence à 'accueil' et finit à 'termine'", () => {
    expect(ETAPES_TUTORIEL[0]).toBe("accueil");
    expect(ETAPES_TUTORIEL[ETAPES_TUTORIEL.length - 1]).toBe("termine");
  });

  it("appliquerFinTutoriel injecte la lettre de Maman, amorce le ch.1 et passe à 'termine'", () => {
    const state = createMockGameState({
      tutorielEtape: "conclusion",
      courriers: [],
      declencheursDeclenches: [],
      missions: [],
    });
    const fin = appliquerFinTutoriel(state);
    expect(fin.tutorielEtape).toBe("termine");
    expect(fin.courriers.some((c) => c.id === ID_LETTRE_MAMAN_DEBUT)).toBe(true);
    expect(fin.declencheursDeclenches).toContain(ID_LETTRE_MAMAN_DEBUT);
    // Chapitre 1 de l'arc principal amorcé (condition "depart")
    expect(fin.courriers.some((c) => c.id === "trame_ch1")).toBe(true);
    expect(fin.missions.some((m) => m.courrierId === "trame_ch1")).toBe(true);
  });

  it("appliquerFinTutoriel est idempotent sur un state déjà terminé", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    expect(appliquerFinTutoriel(state)).toBe(state);
  });
});
