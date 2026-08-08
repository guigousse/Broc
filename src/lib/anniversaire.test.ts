import { describe, expect, it } from "vitest";
import {
  cadeauAnniversaireVisible,
  cadeauEnAttente,
  doigtSwipeVersGramophone,
  estVinyle,
  ID_DECLENCHEUR_CADEAU,
  idDeclencheurCadeau,
  jourAnniversaire,
  JOUR_ANNIVERSAIRE,
  nbAnniversairesAtteints,
  objetCadeauAnniversaire,
  TEMPLATE_VINYLE_CADEAU,
  vinylesCadeauxExclus,
  VINYLES_CADEAU_PAR_ANNEE,
} from "./anniversaire";
import { VINYLE_AUDIO_URLS } from "@/data/vinylesAudio";
import type { GameState } from "@/types/game";

// Fixture minimale pour la partie « possession » de l'état (typage souple
// volontaire : objetCadeauAnniversaire ne lit que ces trois champs).
const stateVide = {
  inventaireJoueur: [] as { templateId: string }[],
  vitrine: null,
  collection: {},
} as unknown as Pick<GameState, "inventaireJoueur" | "vitrine" | "collection">;

describe("cadeau d'anniversaire (11 juin = jour 6)", () => {
  const base = {
    jourActuel: JOUR_ANNIVERSAIRE,
    tutorielEtape: "termine" as const,
    declencheursDeclenches: [] as string[],
  };

  it("visible au jour 6 (et au-delà), tutoriel terminé, pas encore récupéré", () => {
    expect(cadeauAnniversaireVisible(base)).toBe(true);
    expect(cadeauAnniversaireVisible({ ...base, jourActuel: 12 })).toBe(true);
  });

  it("invisible avant le 11 juin, pendant le tutoriel, ou déjà récupéré", () => {
    expect(cadeauAnniversaireVisible({ ...base, jourActuel: 5 })).toBe(false);
    expect(
      cadeauAnniversaireVisible({ ...base, tutorielEtape: "accueil" as never }),
    ).toBe(false);
    expect(
      cadeauAnniversaireVisible({
        ...base,
        declencheursDeclenches: [ID_DECLENCHEUR_CADEAU],
      }),
    ).toBe(false);
  });

  it("le cadeau de l'année 1 est le 33 tours de jazz, en Très bon état", () => {
    const objet = objetCadeauAnniversaire(1, stateVide);
    expect(objet.templateId).toBe(TEMPLATE_VINYLE_CADEAU);
    expect(objet.etat).toBe("Très bon");
    expect(estVinyle(objet.templateId)).toBe(true);
  });

  it("estVinyle reconnaît les deux préfixes et rejette le reste", () => {
    expect(estVinyle("mus.vinyle_swing")).toBe(true);
    expect(estVinyle("mus.33tours_jazz_2")).toBe(true);
    expect(estVinyle("ma.lampe_petrole_ancienne")).toBe(false);
  });
});

describe("doigtSwipeVersGramophone", () => {
  it("visible en zones bureau/porte quand le mini-tuto guide vers l'écoute", () => {
    expect(doigtSwipeVersGramophone("ecouter", 0)).toBe(true);
    expect(doigtSwipeVersGramophone("ecouter", 1)).toBe(true);
  });
  it("absent en zone repos (la main du gramophone prend le relais)", () => {
    expect(doigtSwipeVersGramophone("ecouter", 2)).toBe(false);
  });
  it("absent hors étape ecouter", () => {
    expect(doigtSwipeVersGramophone("ajouter", 1)).toBe(false);
    expect(doigtSwipeVersGramophone(undefined, 1)).toBe(false);
  });
});

// Base d'état minimale pour cadeauEnAttente (adapter aux helpers du fichier existant).
const base = {
  tutorielEtape: "termine" as const,
  declencheursDeclenches: [] as string[],
};

describe("anniversaire annuel", () => {
  it("jourAnniversaire : année 1 = jour 6, année 2 un an plus tard (11 juin 1925)", () => {
    expect(jourAnniversaire(1)).toBe(6);
    expect(jourAnniversaire(2)).toBe(6 + 365); // 1924-06-11 → 1925-06-11 (1924 bissextile, février déjà passé)
  });

  it("nbAnniversairesAtteints compte les 11 juin passés", () => {
    expect(nbAnniversairesAtteints(5)).toBe(0);
    expect(nbAnniversairesAtteints(6)).toBe(1);
    expect(nbAnniversairesAtteints(jourAnniversaire(2) - 1)).toBe(1);
    expect(nbAnniversairesAtteints(jourAnniversaire(3))).toBe(3);
  });

  it("idDeclencheurCadeau : rétro-compatible année 1", () => {
    expect(idDeclencheurCadeau(1)).toBe(ID_DECLENCHEUR_CADEAU);
    expect(idDeclencheurCadeau(2)).toBe("cadeau_anniversaire_a2");
  });

  it("cadeauEnAttente : le plus ancien d'abord, un seul à la fois", () => {
    const state = { ...base, jourActuel: jourAnniversaire(2) };
    expect(cadeauEnAttente(state)).toBe(1);
    const apresAn1 = { ...state, declencheursDeclenches: [idDeclencheurCadeau(1)] };
    expect(cadeauEnAttente(apresAn1)).toBe(2);
    const tout = { ...apresAn1, declencheursDeclenches: [idDeclencheurCadeau(1), idDeclencheurCadeau(2)] };
    expect(cadeauEnAttente(tout)).toBeNull();
  });

  it("cadeauEnAttente : null pendant le tutoriel et avant le jour 6", () => {
    expect(cadeauEnAttente({ ...base, tutorielEtape: "intro" as never, jourActuel: 10 })).toBeNull();
    expect(cadeauEnAttente({ ...base, jourActuel: 5 })).toBeNull();
  });

  it("vinylesCadeauxExclus : les 3 exclusifs tant que non offerts, réintégrés ensuite", () => {
    expect(vinylesCadeauxExclus({ declencheursDeclenches: [] })).toEqual(
      new Set(VINYLES_CADEAU_PAR_ANNEE),
    );
    const apres = vinylesCadeauxExclus({
      declencheursDeclenches: [idDeclencheurCadeau(1), idDeclencheurCadeau(3)],
    });
    expect(apres).toEqual(new Set([VINYLES_CADEAU_PAR_ANNEE[1]]));
  });
});

describe("objetCadeauAnniversaire par année", () => {
  it("années 1-3 : templates fixes, états Très bon puis Pristin", () => {
    const an1 = objetCadeauAnniversaire(1, stateVide);
    expect(an1.templateId).toBe(VINYLES_CADEAU_PAR_ANNEE[0]);
    expect(an1.etat).toBe("Très bon");
    const an2 = objetCadeauAnniversaire(2, stateVide);
    expect(an2.templateId).toBe(VINYLES_CADEAU_PAR_ANNEE[1]);
    expect(an2.etat).toBe("Pristin état");
    const an3 = objetCadeauAnniversaire(3, stateVide);
    expect(an3.templateId).toBe(VINYLES_CADEAU_PAR_ANNEE[2]);
    expect(an3.etat).toBe("Pristin état");
  });

  it("année 4+ : un vinyle du catalogue NON possédé, en Pristin état", () => {
    const tous = Object.keys(VINYLE_AUDIO_URLS);
    const possedesSaufUn = tous.slice(1); // tout sauf le premier
    const state = {
      ...stateVide,
      inventaireJoueur: possedesSaufUn.map((templateId) => ({ templateId }) as never),
    };
    for (let i = 0; i < 20; i++) {
      const cadeau = objetCadeauAnniversaire(4, state);
      expect(cadeau.templateId).toBe(tous[0]);
      expect(cadeau.etat).toBe("Pristin état");
    }
  });

  it("année 4+ à 24/24 : doublon aléatoire du catalogue, jamais d'erreur", () => {
    const tous = Object.keys(VINYLE_AUDIO_URLS);
    const state = {
      ...stateVide,
      inventaireJoueur: tous.map((templateId) => ({ templateId }) as never),
    };
    const cadeau = objetCadeauAnniversaire(4, state);
    expect(tous).toContain(cadeau.templateId);
    expect(cadeau.etat).toBe("Pristin état");
  });
});
