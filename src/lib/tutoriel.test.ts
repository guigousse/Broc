import { describe, expect, it } from "vitest";
import {
  ETAPES_TUTORIEL,
  appliquerFinTutoriel,
  banniereVisible,
  chapitreDuCarnetDu,
  competenceGuidee,
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

  it("doigtSwipeVersCarnet n'existe plus : le livre a quitté le panorama", async () => {
    const mod = await import("./tutoriel");
    expect("doigtSwipeVersCarnet" in mod).toBe(false);
  });

  it("chapitreDuCarnetDu n'arme le chapitre qu'à l'ouverture du carnet pendant le mini-tuto", () => {
    expect(chapitreDuCarnetDu("ouvrir", true)).toBe(true);
    // Mini-tuto déjà consommé : l'ouverture du carnet ne délivre plus rien.
    expect(chapitreDuCarnetDu("termine", true)).toBe(false);
    expect(chapitreDuCarnetDu(undefined, true)).toBe(false);
    // Carnet fermé : rien.
    expect(chapitreDuCarnetDu("ouvrir", false)).toBe(false);
  });

  it("appliquerFinTutoriel est idempotent sur un state déjà terminé", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    expect(appliquerFinTutoriel(state)).toBe(state);
  });
});

describe("fin du tutoriel — le chapitre est dû à l'arrivée sur /quetes", () => {
  it("mini-tuto armé + sur /quetes : le chapitre est dû", () => {
    expect(chapitreDuCarnetDu("ouvrir", true)).toBe(true);
  });

  it("mini-tuto armé mais ailleurs : rien n'est dû", () => {
    expect(chapitreDuCarnetDu("ouvrir", false)).toBe(false);
  });

  it("mini-tuto déjà clos : rien n'est dû même sur /quetes", () => {
    expect(chapitreDuCarnetDu("termine", true)).toBe(false);
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

/**
 * Bannière de consigne — recette device 2026-08-19 : « Ouvre la Collection
 * depuis la barre du bas » restait affiché UNE FOIS DANS la collection, et la
 * bannière recouvrait l'en-tête que le coach cherchait justement à montrer.
 */
describe("banniereVisible", () => {
  it("s'efface là où un autre guide occupe l'écran", () => {
    for (const etape of [
      "accueil", "stockage-focus", "coffre-trace-un", "niveau-celebration",
      "conclusion", "termine",
    ] as const) {
      expect(banniereVisible(etape, "/bureau"), etape).toBe(false);
    }
  });

  it("s'efface quand la consigne « va sur cet onglet » est déjà exaucée", () => {
    expect(banniereVisible("collection-lecon", "/stockage")).toBe(true);
    expect(banniereVisible("collection-lecon", "/collection")).toBe(false);
    expect(banniereVisible("stockage-ouvrir", "/bureau")).toBe(true);
    expect(banniereVisible("stockage-ouvrir", "/stockage")).toBe(false);
    expect(banniereVisible("competences-visite", "/bureau")).toBe(true);
    expect(banniereVisible("competences-visite", "/bibliotheque")).toBe(false);
  });

  it("laisse la consigne d'une ACTION sur place, même sur l'onglet visé", () => {
    // « Envoie la peluche dans ta collection » se fait DEPUIS le stockage :
    // ce n'est pas une consigne de navigation, elle doit rester.
    expect(banniereVisible("collection-envoyer", "/stockage")).toBe(true);
    expect(banniereVisible("ouvrir-colis", "/bureau")).toBe(true);
    expect(banniereVisible("preparer-etal", "/bureau")).toBe(true);
  });

  it("affiche toutes les autres étapes", () => {
    for (const etape of ETAPES_TUTORIEL) {
      if (banniereVisible(etape, "/bureau")) continue;
      expect(
        ["accueil", "stockage-focus", "coffre-trace-un", "niveau-celebration",
          "conclusion", "termine"],
        etape,
      ).toContain(etape);
    }
  });
});
