import { describe, expect, it } from "vitest";
import {
  ETAPES_TUTORIEL,
  appliquerFinTutoriel,
  chapitreDuCarnetDu,
  colisEnAttente,
  doigtSwipeVersCarnet,
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
    // Mini-tuto carnet armé (le grand-père vient d'en parler).
    expect(fin.miniTutoCarnet).toBe("ouvrir");
  });

  it("doigtSwipeVersCarnet pointe tant que la zone gauche (0) n'est pas atteinte", () => {
    expect(doigtSwipeVersCarnet("ouvrir", 1)).toBe(true);
    expect(doigtSwipeVersCarnet("ouvrir", 0)).toBe(false);
    expect(doigtSwipeVersCarnet("termine", 1)).toBe(false);
    expect(doigtSwipeVersCarnet(undefined, 1)).toBe(false);
  });

  it("chapitreDuCarnetDu n'arme le chapitre qu'à l'ouverture de l'onglet Commandes pendant le mini-tuto", () => {
    expect(chapitreDuCarnetDu("ouvrir", "commandes")).toBe(true);
    // Mini-tuto déjà consommé : l'ouverture du carnet ne délivre plus rien.
    expect(chapitreDuCarnetDu("termine", "commandes")).toBe(false);
    expect(chapitreDuCarnetDu(undefined, "commandes")).toBe(false);
    // Autre onglet, ou registre fermé : rien.
    expect(chapitreDuCarnetDu("ouvrir", "comptes")).toBe(false);
    expect(chapitreDuCarnetDu("ouvrir", null)).toBe(false);
  });

  it("appliquerFinTutoriel est idempotent sur un state déjà terminé", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    expect(appliquerFinTutoriel(state)).toBe(state);
  });
});

describe("étapes v2", () => {
  it("ordonne les 17 étapes du nouveau flux", () => {
    expect(ETAPES_TUTORIEL).toEqual([
      "accueil", "aller-chiner",
      "chine-nego-echec", "chine-achat-direct", "chine-nego-un",
      "chine-nego-deux", "chine-sortir",
      "stockage-ouvrir", "stockage-focus",
      "collection-envoyer", "collection-lecon",
      "preparer-etal", "coffre-trace-un", "coffre-trace-deux",
      "premiere-vente", "conclusion", "termine",
    ]);
  });

  it("etapeSuivante enchaîne chine-nego-deux → chine-sortir", () => {
    expect(etapeSuivante("chine-nego-deux")).toBe("chine-sortir");
  });
});

describe("appliquerFinTutoriel (v2)", () => {
  it("ne livre PLUS le colis (inventaire inchangé, compteur intact)", () => {
    const s = createMockGameState({
      tutorielEtape: "accueil",
      colisTutorielLivres: 0,
    });
    const fin = appliquerFinTutoriel(s);
    expect(fin.tutorielEtape).toBe("termine");
    expect(fin.inventaireJoueur).toHaveLength(s.inventaireJoueur.length);
    expect(fin.colisTutorielLivres).toBe(0);
    expect(fin.miniTutoCarnet).toBe("ouvrir");
  });
});

describe("colisEnAttente", () => {
  it("faux tant que le tutoriel court ou que le carnet n'est pas consommé", () => {
    expect(
      colisEnAttente({
        tutorielEtape: "accueil",
        miniTutoCarnet: undefined,
        colisTutorielLivres: 0,
      }),
    ).toBe(false);
    expect(
      colisEnAttente({
        tutorielEtape: "termine",
        miniTutoCarnet: "ouvrir",
        colisTutorielLivres: 0,
      }),
    ).toBe(false);
  });

  it("vrai après le carnet tant que le colis n'est pas vidé", () => {
    expect(
      colisEnAttente({
        tutorielEtape: "termine",
        miniTutoCarnet: "termine",
        colisTutorielLivres: 3,
      }),
    ).toBe(true);
    expect(
      colisEnAttente({
        tutorielEtape: "termine",
        miniTutoCarnet: "termine",
        colisTutorielLivres: 5,
      }),
    ).toBe(false);
  });

  it("vrai pour une vieille save sans miniTutoCarnet et colis entamé", () => {
    expect(
      colisEnAttente({
        tutorielEtape: "termine",
        miniTutoCarnet: undefined,
        colisTutorielLivres: 2,
      }),
    ).toBe(true);
  });
});
