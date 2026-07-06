import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BONUS_SPECIALISATION_CLIENT,
  BOURSE_PAR_CLASSE,
  CLIENT_INTERVALLE_MAX_SEC,
  CLIENT_INTERVALLE_MIN_SEC,
  DEFAULT_MODIFIERS,
  bourseDe,
  bourseMoyenne,
  classeBourse,
  genererClientEvent,
  personaDepuisClient,
  prochainIntervalleClient,
  proposerOffreVente,
} from "./vitrine";
import { ouvrirNegociation } from "./negociation";
import {
  createMockClient,
  createMockObjetEnVitrine,
} from "./__test-fixtures__/gameState";
import type { NegociationState } from "@/types/game";

beforeEach(() => {
  // Fige Math.random à 0.5 par défaut (milieu de plage).
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("constantes", () => {
  it("BONUS_SPECIALISATION_CLIENT > 1", () => {
    expect(BONUS_SPECIALISATION_CLIENT).toBeGreaterThan(1);
  });

  it("DEFAULT_MODIFIERS expose tous les flags neutres", () => {
    expect(DEFAULT_MODIFIERS.bonusToleranceNego).toBe(0);
    expect(DEFAULT_MODIFIERS.bonusToleranceParCategorie.size).toBe(0);
    expect(DEFAULT_MODIFIERS.intervalleMultiplier).toBe(1);
    expect(DEFAULT_MODIFIERS.revelePersona).toBe(false);
    expect(DEFAULT_MODIFIERS.releveBourse).toBe(false);
    expect(DEFAULT_MODIFIERS.oeilAiguise).toBe(false);
    expect(DEFAULT_MODIFIERS.diplomate).toBe(false);
    expect(DEFAULT_MODIFIERS.clientGarantiFancy).toBe(false);
    expect(DEFAULT_MODIFIERS.bonneReputation).toBe(false);
  });

  it("intervalle min < max", () => {
    expect(CLIENT_INTERVALLE_MIN_SEC).toBeLessThan(CLIENT_INTERVALLE_MAX_SEC);
  });
});

describe("classeBourse", () => {
  it("petite si appetitMax <= 0.8", () => {
    expect(classeBourse(createMockClient({ appetitMax: 0.8 }))).toBe("petite");
    expect(classeBourse(createMockClient({ appetitMax: 0.5 }))).toBe("petite");
  });

  it("moyenne si 0.8 < appetitMax <= 1.2", () => {
    expect(classeBourse(createMockClient({ appetitMax: 1.0 }))).toBe("moyenne");
    expect(classeBourse(createMockClient({ appetitMax: 1.2 }))).toBe("moyenne");
  });

  it("grosse si appetitMax > 1.2", () => {
    expect(classeBourse(createMockClient({ appetitMax: 1.3 }))).toBe("grosse");
    expect(classeBourse(createMockClient({ appetitMax: 2.0 }))).toBe("grosse");
  });
});

describe("personaDepuisClient", () => {
  it("transfère les axes de négociation", () => {
    const c = createMockClient({
      archetypeId: "fou",
      margePct: 0.4,
      elanPct: 0.5,
      patience: 7,
      tolerancePct: 0.3,
      sangFroid: 0.2,
    });
    const p = personaDepuisClient(c);
    expect(p.archetype).toBe("fou");
    expect(p.margePct).toBe(0.4);
    expect(p.elanPct).toBe(0.5);
    expect(p.patience).toBe(7);
    expect(p.tolerancePct).toBe(0.3);
    expect(p.sangFroid).toBe(0.2);
  });
});

describe("prochainIntervalleClient", () => {
  it("avec multiplier=1, l'intervalle est dans [MIN, MAX]", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0);
    expect(prochainIntervalleClient(1)).toBe(CLIENT_INTERVALLE_MIN_SEC);
    vi.spyOn(Math, "random").mockReturnValueOnce(0.999);
    const r = prochainIntervalleClient(1);
    expect(r).toBeGreaterThan(CLIENT_INTERVALLE_MIN_SEC);
    expect(r).toBeLessThanOrEqual(CLIENT_INTERVALLE_MAX_SEC);
  });

  it("multiplier 0.5 divise l'intervalle par 2", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0);
    expect(prochainIntervalleClient(0.5)).toBe(CLIENT_INTERVALLE_MIN_SEC * 0.5);
  });
});

describe("genererClientEvent — cas vides", () => {
  it("retourne null sur vitrine vide", () => {
    const c = createMockClient();
    expect(genererClientEvent(c, [])).toBeNull();
  });

  it("retourne null si aucun objet n'est accessible (prix trop élevés)", () => {
    const c = createMockClient({ appetitMax: 1.0 });
    // prixVente = 10000 sur prixRef = 100 → bien au-delà du plafond.
    const vitrine = [
      createMockObjetEnVitrine({
        objet: { prixReferenceReel: 100 },
        prixVente: 10000,
      }),
    ];
    expect(genererClientEvent(c, vitrine)).toBeNull();
  });
});

describe("genererClientEvent — mode achat-direct", () => {
  it("achat-direct si prixDemande largement sous le prixMax", () => {
    const c = createMockClient({ appetitMin: 1, appetitMax: 1 });
    const vitrine = [
      createMockObjetEnVitrine({
        objet: { prixReferenceReel: 100 },
        prixVente: 50, // < prixMax (~100)
      }),
    ];
    const ev = genererClientEvent(c, vitrine);
    expect(ev).not.toBeNull();
    expect(ev!.mode).toBe("achat-direct");
    expect(ev!.offreInitiale).toBe(ev!.prixDemande);
  });
});

describe("genererClientEvent — mode négociation (prix trop cher)", () => {
  it("retourne une offre proche du prixMax si prix demandé écrase le seuil de colère", () => {
    const c = createMockClient({ appetitMin: 1, appetitMax: 1, durete: 0.5 });
    const vitrine = [
      createMockObjetEnVitrine({
        objet: { prixReferenceReel: 100 },
        prixVente: 150, // bien au-dessus du prixMax (~100), mais sous le plafond d'intérêt
      }),
    ];
    const ev = genererClientEvent(c, vitrine);
    expect(ev).not.toBeNull();
    expect(ev!.mode).toBe("negociation");
    // Offre clamp à >= 1 et proche du prixMax
    expect(ev!.offreInitiale).toBeGreaterThanOrEqual(1);
    expect(ev!.offreInitiale).toBeLessThanOrEqual(ev!.prixMax);
  });
});

describe("genererClientEvent — invariants généraux", () => {
  it("prixDemande = somme des prixVente du panier", () => {
    const c = createMockClient({ appetitMin: 1, appetitMax: 1 });
    const vitrine = [
      createMockObjetEnVitrine({
        objet: { prixReferenceReel: 100 },
        prixVente: 80,
      }),
    ];
    const ev = genererClientEvent(c, vitrine);
    expect(ev!.prixDemande).toBe(80);
  });

  it("ID UUID-like (chaîne non vide unique)", () => {
    const c = createMockClient();
    const vitrine = [
      createMockObjetEnVitrine({
        objet: { prixReferenceReel: 100 },
        prixVente: 50,
      }),
    ];
    const ev1 = genererClientEvent(c, vitrine);
    const ev2 = genererClientEvent(c, vitrine);
    expect(ev1!.id).toBeTruthy();
    expect(ev2!.id).toBeTruthy();
    expect(ev1!.id).not.toBe(ev2!.id);
  });

  it("client fancy a un appetitMin / appetitMax boosté", () => {
    const c = createMockClient({ appetitMin: 1, appetitMax: 1 });
    const vitrine = [
      createMockObjetEnVitrine({
        objet: { prixReferenceReel: 100 },
        prixVente: 50,
      }),
    ];
    const ev = genererClientEvent(c, vitrine, [], DEFAULT_MODIFIERS, {
      fancy: true,
    });
    expect(ev).not.toBeNull();
    expect(ev!.persona.appetitMin).toBeGreaterThan(1);
    expect(ev!.persona.appetitMax).toBeGreaterThan(1);
    expect(ev!.fancy).toBe(true);
  });
});

describe("proposerOffreVente — sans Diplomate (délégation pure)", () => {
  it("délègue à proposerOffre (accord direct au prix adverse)", () => {
    const nego = ouvrirNegociation("vente", 50, 90);
    const client = createMockClient();
    const res = proposerOffreVente(nego, client, 50);
    expect(res.statut).toBe("conclu");
  });
});

describe("proposerOffreVente — Diplomate transforme fache en en_cours", () => {
  it("avec diplomate=true et révélation pas encore faite, repasse en_cours", () => {
    const nego = ouvrirNegociation("vente", 50, 90);
    const client = createMockClient({ tolerancePct: 0.1 }); // seuil insulte resserré
    const modifiers = { ...DEFAULT_MODIFIERS, diplomate: true };
    // Offre 80 = 50 * 1.6, bien au-dessus du seuil (50 * 1.1 = 55) → fache
    const res = proposerOffreVente(nego, client, 80, modifiers, {
      revelationDejaFaite: false,
    });
    expect(res.statut).toBe("en_cours");
    expect(res.message).toMatch(/plafond/i);
  });

  it("si la révélation a déjà été faite, fache n'est plus transformée", () => {
    const nego = ouvrirNegociation("vente", 50, 90);
    const client = createMockClient({ tolerancePct: 0.1 });
    const modifiers = { ...DEFAULT_MODIFIERS, diplomate: true };
    const res = proposerOffreVente(nego, client, 80, modifiers, {
      revelationDejaFaite: true,
    });
    expect(res.statut).toBe("fache");
  });
});

describe("proposerOffreVente — boost de tolérance (Verbe haut/d'or)", () => {
  it("une contre-offre insultante sans boost passe avec +40 %", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const nego = {
      mode: "vente",
      tour: 1,
      humeur: 0,
      prixAdverseCourant: 100,
      cibleSecrete: 120,
      derniereOffreJoueur: null,
      statut: "en_cours",
      message: "",
    } as NegociationState;
    const client = createMockClient({ tolerancePct: 0.2, sangFroid: 1, patience: 9 });
    // offre à 125 : delta 25 % > 20 % → insultante sans boost
    const sans = proposerOffreVente(nego, client, 125, DEFAULT_MODIFIERS, {});
    expect(sans.statut).toBe("fache");
    // avec boost 0.4 : tolérance effective 0.28 → 125 (25 %) n'est plus insultante
    const avec = proposerOffreVente(nego, client, 125, DEFAULT_MODIFIERS, {
      toleranceBoost: 0.4,
    });
    expect(avec.statut).not.toBe("fache");
  });
});

/* ===================================================================== */
/* Plafond de bourse par classe de client                                */
/* ===================================================================== */

describe("bourse des clients — plafond absolu", () => {
  it("BOURSE_PAR_CLASSE définit des montants strictement croissants", () => {
    expect(BOURSE_PAR_CLASSE.petite).toBeGreaterThan(0);
    expect(BOURSE_PAR_CLASSE.moyenne).toBeGreaterThan(BOURSE_PAR_CLASSE.petite);
    expect(BOURSE_PAR_CLASSE.grosse).toBeGreaterThan(BOURSE_PAR_CLASSE.moyenne);
  });

  it("bourseDe retourne la bourse de la classe du persona", () => {
    expect(bourseDe(createMockClient({ appetitMax: 0.7 }))).toBe(BOURSE_PAR_CLASSE.petite);
    expect(bourseDe(createMockClient({ appetitMax: 1.1 }))).toBe(BOURSE_PAR_CLASSE.moyenne);
    expect(bourseDe(createMockClient({ appetitMax: 1.5 }))).toBe(BOURSE_PAR_CLASSE.grosse);
  });

  it("bourseDe respecte un bourseMax explicite (célébrité)", () => {
    const c = createMockClient({ appetitMax: 2.5, bourseMax: 6000 });
    expect(bourseDe(c)).toBe(6000);
  });

  it("le prixMax d'un client ne dépasse jamais sa bourse", () => {
    // Grosse bourse (appétit 1,4-1,5) devant un objet de très haute valeur :
    // sans plafond, prixMax ≈ 10 000 × 1,45 ; avec plafond → ≤ 2 000.
    const c = createMockClient({ appetitMin: 1.4, appetitMax: 1.5 });
    const vitrine = [
      createMockObjetEnVitrine({
        objet: { prixReferenceReel: 10000 },
        prixVente: 1900,
      }),
    ];
    const ev = genererClientEvent(c, vitrine);
    expect(ev).not.toBeNull();
    expect(ev!.prixMax).toBeLessThanOrEqual(BOURSE_PAR_CLASSE.grosse);
  });

  it("une petite bourse n'envisage pas un objet affiché loin au-dessus de ses moyens", () => {
    // Avant plafond : plafond d'intérêt = 10 000 × 0,8 × 1,6 = 12 800 → il
    // aurait « envisagé » un objet à 9 000 € qu'il ne peut pas payer.
    const c = createMockClient({ appetitMin: 0.6, appetitMax: 0.8 });
    const vitrine = [
      createMockObjetEnVitrine({
        objet: { prixReferenceReel: 10000 },
        prixVente: 9000,
      }),
    ];
    expect(genererClientEvent(c, vitrine)).toBeNull();
  });

  it("la bourse plafonne aussi un panier multi-objets (bonus bundle compris)", () => {
    const c = createMockClient({ appetitMin: 1.4, appetitMax: 1.5, chanceMulti: 1 });
    const vitrine = [
      createMockObjetEnVitrine({ objet: { prixReferenceReel: 5000 }, prixVente: 1500 }),
      createMockObjetEnVitrine({ objet: { prixReferenceReel: 5000 }, prixVente: 1500 }),
    ];
    const ev = genererClientEvent(c, vitrine);
    expect(ev).not.toBeNull();
    expect(ev!.panier.length).toBe(2);
    expect(ev!.prixMax).toBeLessThanOrEqual(BOURSE_PAR_CLASSE.grosse);
  });

  it("sous le plafond, le comportement est inchangé", () => {
    const c = createMockClient({ appetitMin: 1, appetitMax: 1 });
    const vitrine = [
      createMockObjetEnVitrine({ objet: { prixReferenceReel: 100 }, prixVente: 50 }),
    ];
    const ev = genererClientEvent(c, vitrine);
    expect(ev).not.toBeNull();
    expect(ev!.mode).toBe("achat-direct");
    // appétit figé à 1 (random 0.5), pas de préférence → prixMax = 100
    expect(ev!.prixMax).toBe(100);
  });
});

describe("calculerPrixMax — la Passion perce le plafond de bourse", () => {
  it("bonus Passion 30% étend le plafond (cote 400, bourse moyenne 300 → 390)", () => {
    const c = createMockClient({ appetitMin: 1, appetitMax: 1 });
    const vitrine = [
      createMockObjetEnVitrine({
        objet: { prixReferenceReel: 400, categorie: "Musique" },
        prixVente: 350,
      }),
    ];
    const modifiers = {
      ...DEFAULT_MODIFIERS,
      bonusPassionParCategorie: new Map([["Musique", 0.3] as const]),
    };
    const ev = genererClientEvent(c, vitrine, [], modifiers);
    expect(ev).not.toBeNull();
    // brut = 400 × 1 × 1.3 = 520 ; plafond percé = 300 × 1.3 = 390 → min = 390.
    expect(ev!.prixMax).toBe(390);
  });

  it("sans Passion, le plafond de bourse reste ferme (cote 400, bourse moyenne 300 → 300)", () => {
    const c = createMockClient({ appetitMin: 1, appetitMax: 1 });
    const vitrine = [
      createMockObjetEnVitrine({
        objet: { prixReferenceReel: 400, categorie: "Musique" },
        prixVente: 350,
      }),
    ];
    const ev = genererClientEvent(c, vitrine, [], DEFAULT_MODIFIERS);
    expect(ev).not.toBeNull();
    expect(ev!.prixMax).toBe(300);
  });
});

describe("bourseMoyenne — affichage par brocante", () => {
  it("croît avec le tier (les grosses bourses n'arrivent qu'en tiers 3)", () => {
    expect(bourseMoyenne(1)).toBeLessThan(bourseMoyenne(3));
    expect(bourseMoyenne(2)).toBeLessThanOrEqual(bourseMoyenne(3));
  });

  it("les tiers 3 et 4 partagent le même vivier de clients", () => {
    expect(bourseMoyenne(3)).toBe(bourseMoyenne(4));
  });

  it("vaut la moyenne des bourses des personas éligibles au tier", () => {
    // Tier 1 : retraite (petite 80), étudiant (petite 80), touriste (grosse 2000),
    // famille (moyenne 300), opportuniste (moyenne 300) → 2760 / 5 = 552.
    expect(bourseMoyenne(1)).toBe(552);
  });
});
