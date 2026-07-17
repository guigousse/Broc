import { describe, expect, it } from "vitest";
import {
  ETAPES_TUTORIEL,
  appliquerFinTutoriel,
  etapeSuivante,
  tutorielActif,
} from "./tutoriel";
import { ID_LETTRE_MAMAN_DEBUT } from "./courrier";
import { chapitrePret } from "./quetes/principales";
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

  it("appliquerFinTutoriel injecte la lettre de Maman et passe à 'termine' (chapitre 1 délivrable en dialogue, pas injecté)", () => {
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
    // Depuis SP2 : plus d'injection auto du chapitre 1, il est délivré en
    // dialogue — mais chapitrePret le désigne bien comme dû (condition "depart").
    expect(fin.courriers.some((c) => c.id === "trame_ch1")).toBe(false);
    expect(chapitrePret(fin)?.id).toBe("trame_ch1");
  });

  it("appliquerFinTutoriel est idempotent sur un state déjà terminé", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    expect(appliquerFinTutoriel(state)).toBe(state);
  });

  it("« Passer » livre le restant du colis : 5 objets (4 communs + 1 rare) sur une partie fraîche", () => {
    const state = createMockGameState({
      tutorielEtape: "accueil",
      inventaireJoueur: [],
      colisTutorielLivres: 0,
      courriers: [],
      declencheursDeclenches: [],
      missions: [],
    });
    const fin = appliquerFinTutoriel(state);
    expect(fin.inventaireJoueur).toHaveLength(5);
    expect(fin.inventaireJoueur.filter((o) => o.rarete === "commun")).toHaveLength(4);
    expect(fin.inventaireJoueur.filter((o) => o.rarete === "rare")).toHaveLength(1);
    expect(fin.colisTutorielLivres).toBe(5);
  });

  it("« Passer » après un colis entièrement récupéré ne double pas les objets", () => {
    const state = createMockGameState({
      tutorielEtape: "preparer-etal",
      colisTutorielLivres: 5,
      courriers: [],
      declencheursDeclenches: [],
      missions: [],
    });
    const avant = state.inventaireJoueur.length;
    const fin = appliquerFinTutoriel(state);
    expect(fin.inventaireJoueur).toHaveLength(avant);
    expect(fin.colisTutorielLivres).toBe(5);
  });
});
