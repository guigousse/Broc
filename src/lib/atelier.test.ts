import { describe, expect, it } from "vitest";
import {
  appliquerRecuperation,
  atelierAuneSlotLibre,
  atelierStatusPourObjet,
  collectionStatusPourObjet,
  coutAmelioration,
  nbRestaurationsEnCours,
  peutDemanteler,
  peutRestaurerTransition,
  prochaineEtatCible,
  rendementDemantelement,
  trouverSlotCollection,
} from "./atelier";
import {
  createMockGameState,
  createMockObjet,
  createMockSlot,
  withCompetences,
  withPieces,
} from "./__test-fixtures__/gameState";
import { DICTIONNAIRES } from "@/lib/i18n/ui";

describe("prochaineEtatCible", () => {
  it("Mauvais → Bon", () => expect(prochaineEtatCible("Mauvais")).toBe("Bon"));
  it("Bon → Très bon", () =>
    expect(prochaineEtatCible("Bon")).toBe("Très bon"));
  it("Très bon → Pristin état", () =>
    expect(prochaineEtatCible("Très bon")).toBe("Pristin état"));
  it("Pristin état → null (sommet)", () =>
    expect(prochaineEtatCible("Pristin état")).toBeNull());
});

describe("coutAmelioration", () => {
  it("est strictement positif (min 1)", () => {
    const o = createMockObjet({ prixReferenceReel: 1, etat: "Bon" });
    expect(coutAmelioration(o, "Très bon")).toBeGreaterThanOrEqual(1);
  });

  it("retourne un entier", () => {
    const o = createMockObjet({ prixReferenceReel: 37, etat: "Bon" });
    expect(Number.isInteger(coutAmelioration(o, "Très bon"))).toBe(true);
  });

  it("monte avec la prixReferenceReel à transition égale", () => {
    const a = createMockObjet({ prixReferenceReel: 50, etat: "Bon" });
    const b = createMockObjet({ prixReferenceReel: 500, etat: "Bon" });
    expect(coutAmelioration(b, "Très bon")).toBeGreaterThan(
      coutAmelioration(a, "Très bon"),
    );
  });
});

describe("rendementDemantelement", () => {
  it("est strictement positif (min 1) même pour prix=1", () => {
    const o = createMockObjet({ prixReferenceReel: 1 });
    expect(rendementDemantelement(o)).toBeGreaterThanOrEqual(1);
  });

  it("retourne un entier", () => {
    const o = createMockObjet({ prixReferenceReel: 37 });
    expect(Number.isInteger(rendementDemantelement(o))).toBe(true);
  });

  it("formule = floor(prix / 5)", () => {
    expect(rendementDemantelement(createMockObjet({ prixReferenceReel: 100 }))).toBe(
      20,
    );
    expect(rendementDemantelement(createMockObjet({ prixReferenceReel: 49 }))).toBe(
      9,
    );
  });
});

describe("trouverSlotCollection", () => {
  it("trouve un slot par templateId", () => {
    const slot = createMockSlot({ templateId: "t1", categorie: "Musique" });
    const state = createMockGameState({
      collection: { ...createMockGameState().collection, Musique: [slot] },
    });
    expect(trouverSlotCollection(state.collection, "t1")).toBe(slot);
  });

  it("retourne null si introuvable", () => {
    const state = createMockGameState();
    expect(trouverSlotCollection(state.collection, "inconnu")).toBeNull();
  });
});

describe("nbRestaurationsEnCours / atelierAuneSlotLibre", () => {
  it("compte les objets enRestauration=true dans l'inventaire", () => {
    const state = createMockGameState({
      inventaireJoueur: [
        createMockObjet({ enRestauration: { etatCible: "Bon", debutMs: 0, finMs: 10 } }),
        createMockObjet({ enRestauration: undefined }),
        createMockObjet({ enRestauration: { etatCible: "Bon", debutMs: 0, finMs: 10 } }),
      ],
    });
    expect(nbRestaurationsEnCours(state)).toBe(2);
  });

  it("atelier niveau 1 a 1 slot ⇒ slot libre si 0 en cours", () => {
    const state = createMockGameState({ niveauAtelier: 1 });
    expect(atelierAuneSlotLibre(state)).toBe(true);
  });

  it("atelier niveau 1 plein avec 1 en cours", () => {
    const state = createMockGameState({
      niveauAtelier: 1,
      inventaireJoueur: [createMockObjet({ enRestauration: { etatCible: "Bon", debutMs: 0, finMs: 10 } })],
    });
    expect(atelierAuneSlotLibre(state)).toBe(false);
  });

  it("atelier niveau 3 accueille au moins 2 restaurations simultanées", () => {
    const state = createMockGameState({
      niveauAtelier: 3,
      inventaireJoueur: [
        createMockObjet({ enRestauration: { etatCible: "Bon", debutMs: 0, finMs: 10 } }),
        createMockObjet({ enRestauration: { etatCible: "Bon", debutMs: 0, finMs: 10 } }),
      ],
    });
    expect(atelierAuneSlotLibre(state)).toBe(true);
  });
});

describe("peutRestaurerTransition", () => {
  it("retourne false si compétence absente", () => {
    const state = createMockGameState();
    expect(peutRestaurerTransition(state, "Musique", "Mauvais")).toBe(false);
  });

  it("vrai si compétence Réparer palier 1 débloquée (Mauvais → Bon)", () => {
    const state = withCompetences(createMockGameState(), [
      "cat.Musique.reparer.1",
    ]);
    expect(peutRestaurerTransition(state, "Musique", "Mauvais")).toBe(true);
  });

  it("Bon nécessite palier 2, pas palier 1", () => {
    const state1 = withCompetences(createMockGameState(), [
      "cat.Musique.reparer.1",
    ]);
    const state2 = withCompetences(createMockGameState(), [
      "cat.Musique.reparer.2",
    ]);
    expect(peutRestaurerTransition(state1, "Musique", "Bon")).toBe(false);
    expect(peutRestaurerTransition(state2, "Musique", "Bon")).toBe(true);
  });

  it("Pristin état n'est jamais restaurable", () => {
    const state = withCompetences(createMockGameState(), [
      "cat.Musique.reparer.1",
      "cat.Musique.reparer.2",
      "cat.Musique.reparer.3",
    ]);
    expect(peutRestaurerTransition(state, "Musique", "Pristin état")).toBe(
      false,
    );
  });
});

describe("atelierStatusPourObjet — refus", () => {
  it("refus si objet déjà en restauration", () => {
    const state = createMockGameState();
    const o = createMockObjet({ enRestauration: { etatCible: "Bon", debutMs: 0, finMs: 10 } });
    const res = atelierStatusPourObjet(state, o, DICTIONNAIRES.fr);
    expect(res.disponible).toBe(false);
    expect(res.raison).toMatch(/cours/i);
  });

  it("refus si objet en Pristin état", () => {
    const state = createMockGameState();
    const o = createMockObjet({ etat: "Pristin état" });
    expect(atelierStatusPourObjet(state, o, DICTIONNAIRES.fr).disponible).toBe(false);
  });

  it("refus si atelier plein", () => {
    const state = createMockGameState({
      niveauAtelier: 1,
      inventaireJoueur: [createMockObjet({ enRestauration: { etatCible: "Bon", debutMs: 0, finMs: 10 } })],
    });
    const o = createMockObjet({ etat: "Mauvais" });
    expect(atelierStatusPourObjet(state, o, DICTIONNAIRES.fr).disponible).toBe(false);
  });

  it("refus si compétence Réparer manquante", () => {
    const state = createMockGameState();
    const o = createMockObjet({ etat: "Mauvais", categorie: "Musique" });
    const res = atelierStatusPourObjet(state, o, DICTIONNAIRES.fr);
    expect(res.disponible).toBe(false);
    expect(res.raison).toMatch(/compétence/i);
  });

  it("refus si pièces insuffisantes (annonce le manque)", () => {
    let state = withCompetences(createMockGameState(), [
      "cat.Musique.reparer.1",
    ]);
    state = withPieces(state, "Musique", 0);
    const o = createMockObjet({
      etat: "Mauvais",
      categorie: "Musique",
      prixReferenceReel: 500,
    });
    const res = atelierStatusPourObjet(state, o, DICTIONNAIRES.fr);
    expect(res.disponible).toBe(false);
    expect(res.raison).toMatch(/pièce/i);
  });
});

describe("atelierStatusPourObjet — succès", () => {
  it("disponible quand toutes les conditions sont satisfaites", () => {
    let state = withCompetences(createMockGameState(), [
      "cat.Musique.reparer.1",
    ]);
    state = withPieces(state, "Musique", 999);
    const o = createMockObjet({
      etat: "Mauvais",
      categorie: "Musique",
      prixReferenceReel: 100,
    });
    expect(atelierStatusPourObjet(state, o, DICTIONNAIRES.fr).disponible).toBe(true);
  });
});

describe("collectionStatusPourObjet", () => {
  it("disponible si pas de slot pour ce templateId", () => {
    const state = createMockGameState();
    const o = createMockObjet({ templateId: "absent" });
    const res = collectionStatusPourObjet(state, o);
    expect(res.disponible).toBe(true);
    expect(res.necessiteConfirmation).toBe(false);
  });

  it("indisponible si l'objet est en restauration", () => {
    const state = createMockGameState();
    const o = createMockObjet({ enRestauration: { etatCible: "Bon", debutMs: 0, finMs: 10 } });
    expect(collectionStatusPourObjet(state, o).disponible).toBe(false);
  });

  it("indisponible si donation existante avec exact même état (doublon)", () => {
    const slot = createMockSlot({
      templateId: "t1",
      categorie: "Musique",
      donation: { etat: "Bon", valeur: 50 },
    });
    const state = createMockGameState({
      collection: { ...createMockGameState().collection, Musique: [slot] },
    });
    const o = createMockObjet({ templateId: "t1", categorie: "Musique", etat: "Bon" });
    expect(collectionStatusPourObjet(state, o).disponible).toBe(false);
  });

  it("nécessite confirmation si donation existante avec état différent", () => {
    const slot = createMockSlot({
      templateId: "t1",
      categorie: "Musique",
      donation: { etat: "Mauvais", valeur: 10 },
    });
    const state = createMockGameState({
      collection: { ...createMockGameState().collection, Musique: [slot] },
    });
    const o = createMockObjet({
      templateId: "t1",
      categorie: "Musique",
      etat: "Pristin état",
    });
    const res = collectionStatusPourObjet(state, o);
    expect(res.disponible).toBe(true);
    expect(res.necessiteConfirmation).toBe(true);
    expect(res.ancienneDonation).toEqual({ etat: "Mauvais", valeur: 10 });
  });
});

describe("peutDemanteler", () => {
  it("refus si l'objet est en restauration", () => {
    const o = createMockObjet({ enRestauration: { etatCible: "Bon", debutMs: 0, finMs: 10 } });
    const state = createMockGameState({ inventaireJoueur: [o] });
    expect(peutDemanteler(state, o, DICTIONNAIRES.fr).disponible).toBe(false);
  });

  it("refus si l'objet n'est pas en stock", () => {
    const o = createMockObjet({ id: "obj-absent" });
    const state = createMockGameState({ inventaireJoueur: [] });
    expect(peutDemanteler(state, o, DICTIONNAIRES.fr).disponible).toBe(false);
  });

  it("OK si en stock et hors restauration", () => {
    const o = createMockObjet();
    const state = createMockGameState({ inventaireJoueur: [o] });
    expect(peutDemanteler(state, o, DICTIONNAIRES.fr).disponible).toBe(true);
  });
});

describe("appliquerRecuperation", () => {
  it("retourne null si l'objet n'existe pas", () => {
    const s = createMockGameState({ inventaireJoueur: [] });
    expect(appliquerRecuperation(s, "inconnu", 999999)).toBeNull();
  });

  it("retourne null si l'objet n'est pas en restauration", () => {
    const o = createMockObjet({ id: "o1", etat: "Bon" });
    const s = createMockGameState({ inventaireJoueur: [o] });
    expect(appliquerRecuperation(s, "o1", 999999)).toBeNull();
  });

  it("retourne null si la restauration n'est pas encore terminée", () => {
    const o = createMockObjet({
      id: "o1",
      etat: "Bon",
      enRestauration: { etatCible: "Très bon", debutMs: 0, finMs: 10 },
    });
    const s = createMockGameState({ inventaireJoueur: [o], jourActuel: 5 });
    expect(appliquerRecuperation(s, "o1", 0)).toBeNull();
  });

  it("mute l'état et efface enRestauration quand prêt", () => {
    const o = createMockObjet({
      id: "o1",
      etat: "Bon",
      prixReferenceReel: 100,
      enRestauration: { etatCible: "Très bon", debutMs: 0, finMs: 5 },
    });
    const s = createMockGameState({ inventaireJoueur: [o], jourActuel: 5 });
    const next = appliquerRecuperation(s, "o1", 999999);
    expect(next).not.toBeNull();
    const updated = next!.inventaireJoueur.find((x) => x.id === "o1")!;
    expect(updated.etat).toBe("Très bon");
    expect(updated.enRestauration).toBeUndefined();
    expect(updated.prixReferenceReel).toBeGreaterThan(100);
  });

  it("ne touche pas aux autres objets de l'inventaire", () => {
    const o1 = createMockObjet({
      id: "o1",
      etat: "Bon",
      enRestauration: { etatCible: "Très bon", debutMs: 0, finMs: 1 },
    });
    const o2 = createMockObjet({ id: "o2", etat: "Mauvais" });
    const s = createMockGameState({
      inventaireJoueur: [o1, o2],
      jourActuel: 5,
    });
    const next = appliquerRecuperation(s, "o1", 999999)!;
    expect(next.inventaireJoueur.find((x) => x.id === "o2")).toEqual(o2);
  });
});
