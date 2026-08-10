import { describe, expect, it } from "vitest";
import {
  ETAPES_TUTORIEL,
  appliquerFinTutoriel,
  chapitreDuCarnetDu,
  competenceGuidee,
  doigtSwipeVersCarnet,
  etapeSuivante,
  ongletTutorielPermis,
  portePulse,
  tutorielActif,
} from "./tutoriel";
import { ID_LETTRE_MAMAN_DEBUT } from "./courrier";
import { chapitrePret } from "./quetes/principales";
import { createMockGameState } from "./__test-fixtures__/gameState";
import { COLIS_TUTORIEL_SCRIPTE, COMPETENCE_PREMIER_POINT } from "@/data/tutorielScenario";
import { objetColisTutoriel, COLIS_TUTORIEL_TAILLE } from "@/data/starterInventory";

describe("tutoriel", () => {
  it("tutorielActif est vrai pour toute étape sauf 'termine'", () => {
    expect(tutorielActif({ tutorielEtape: "accueil" })).toBe(true);
    expect(tutorielActif({ tutorielEtape: "vente-nego" })).toBe(true);
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

describe("étapes v4", () => {
  it("ordonne les 23 étapes du flux (colis + 3 leçons de vente + leçon de montée de niveau)", () => {
    expect(ETAPES_TUTORIEL).toEqual([
      "accueil", "aller-chiner",
      "chine-nego-echec", "chine-achat-direct", "chine-nego-un",
      "chine-nego-deux", "chine-sortir",
      "stockage-ouvrir", "stockage-focus",
      "collection-envoyer", "collection-lecon",
      "ouvrir-colis",
      "preparer-etal", "coffre-trace-un", "coffre-trace-deux",
      "vente-refus", "vente-directe", "vente-nego",
      "niveau-celebration", "competences-visite", "competences-choix",
      "conclusion", "termine",
    ]);
  });

  it("etapeSuivante enchaîne chine-nego-deux → chine-sortir", () => {
    expect(etapeSuivante("chine-nego-deux")).toBe("chine-sortir");
  });
});

describe("leçon de montée de niveau", () => {
  it("guide vers l'écran Compétences pendant la visite et le choix", () => {
    expect(ongletTutorielPermis("competences-visite")).toBe("/bibliotheque");
    expect(ongletTutorielPermis("competences-choix")).toBe("/bibliotheque");
  });
  it("ne guide nulle part pendant la célébration (elle se joue au bureau)", () => {
    expect(ongletTutorielPermis("niveau-celebration")).toBeNull();
  });
  it("competenceGuidee ne désigne la cible qu'à l'étape du choix", () => {
    expect(competenceGuidee("competences-choix")).toBe(COMPETENCE_PREMIER_POINT);
    expect(competenceGuidee("competences-visite")).toBeNull();
    expect(competenceGuidee("conclusion")).toBeNull();
    expect(competenceGuidee("termine")).toBeNull();
  });
});

describe("portePulse — la porte ne pulse que quand elle est le chemin", () => {
  it("pulse aux étapes prescrites", () => {
    for (const e of ["aller-chiner", "chine-nego-echec", "chine-achat-direct",
      "chine-nego-un", "chine-nego-deux", "preparer-etal",
      "vente-refus", "vente-directe", "vente-nego"] as const) {
      expect(portePulse(e), e).toBe(true);
    }
  });
  it("ne pulse pas à chine-sortir ni pendant stockage/collection/colis", () => {
    for (const e of ["chine-sortir", "stockage-ouvrir", "stockage-focus",
      "collection-envoyer", "collection-lecon", "ouvrir-colis",
      "coffre-trace-un", "coffre-trace-deux", "accueil", "conclusion", "termine"] as const) {
      expect(portePulse(e), e).toBe(false);
    }
  });
});

describe("appliquerFinTutoriel (v2)", () => {
  it("livre à nouveau le colis scripté (inventaire enrichi, compteur au maximum)", () => {
    const s = createMockGameState({
      tutorielEtape: "accueil",
      colisTutorielLivres: 0,
    });
    const fin = appliquerFinTutoriel(s);
    expect(fin.tutorielEtape).toBe("termine");
    expect(fin.inventaireJoueur).toHaveLength(
      s.inventaireJoueur.length + COLIS_TUTORIEL_TAILLE,
    );
    expect(fin.colisTutorielLivres).toBe(COLIS_TUTORIEL_TAILLE);
    expect(fin.miniTutoCarnet).toBe("ouvrir");
  });
});

describe("colis scripté", () => {
  it("objetColisTutoriel sert les 5 objets fixes, dans l'ordre", () => {
    for (let i = 0; i < COLIS_TUTORIEL_TAILLE; i++) {
      const o = objetColisTutoriel(i);
      expect(o.templateId).toBe(COLIS_TUTORIEL_SCRIPTE[i].templateId);
      expect(o.etat).toBe(COLIS_TUTORIEL_SCRIPTE[i].etat);
    }
  });

  it("appliquerFinTutoriel livre le reliquat du colis scripté (fail-open « Passer »)", () => {
    const s = createMockGameState({
      tutorielEtape: "accueil",
      colisTutorielLivres: 2,
    });
    const fin = appliquerFinTutoriel(s);
    expect(fin.colisTutorielLivres).toBe(COLIS_TUTORIEL_TAILLE);
    const ids = fin.inventaireJoueur.map((o) => o.templateId);
    for (const attendu of COLIS_TUTORIEL_SCRIPTE.slice(2).map((c) => c.templateId)) {
      expect(ids).toContain(attendu);
    }
  });
});
