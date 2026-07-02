import { describe, expect, it } from "vitest";
import {
  BONUS_SPECIALISATION,
  SEUIL_COLERE_VENDEUR,
  SURCOTE_BONIMENTEUR,
  genererSession,
} from "./chine";
import { createMockBrocante } from "./__test-fixtures__/gameState";

describe("constantes exportées", () => {
  it("SEUIL_COLERE_VENDEUR est dans (0, 1)", () => {
    expect(SEUIL_COLERE_VENDEUR).toBeGreaterThan(0);
    expect(SEUIL_COLERE_VENDEUR).toBeLessThan(1);
  });

  it("BONUS_SPECIALISATION est > 1 (majoration de prix)", () => {
    expect(BONUS_SPECIALISATION).toBeGreaterThan(1);
  });
});

describe("genererSession — taille", () => {
  it("retourne un tableau vide si taille = 0", () => {
    const items = genererSession(0);
    expect(items).toEqual([]);
  });

  it("génère ~N items pour une demande de taille N", () => {
    const items = genererSession(10);
    // maxAttempts = N * 6, mais on évite les doublons rares/légendaires donc
    // il peut y avoir un léger sous-remplissage. On vérifie une borne basse.
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.length).toBeLessThanOrEqual(10);
  });

  it("respecte la taille pour des sessions petites", () => {
    const items = genererSession(3);
    expect(items.length).toBe(3);
  });
});

describe("genererSession — structure des items", () => {
  it("chaque item a tous les champs requis", () => {
    const items = genererSession(5);
    for (const it of items) {
      expect(it.id).toBeTruthy();
      expect(it.objet).toBeDefined();
      expect(it.objet.id).toBeTruthy();
      expect(it.objet.templateId).toBeTruthy();
      expect(it.objet.nom).toBeTruthy();
      expect(it.objet.categorie).toBeTruthy();
      expect(it.objet.etat).toBeTruthy();
      expect(it.objet.prixReferenceReel).toBeGreaterThan(0);
      expect(it.prixVendeur).toBeGreaterThan(0);
      expect(it.prixMinAccept).toBeGreaterThan(0);
      expect(it.prixMinAccept).toBeLessThanOrEqual(it.prixVendeur);
      expect(it.statut).toBe("disponible");
      expect(it.negociation).toBeNull();
      expect(it.negociationsTentees).toBe(0);
      expect(typeof it.prixAffiche).toBe("boolean");
    }
  });

  it("ne génère pas d'objets en Pristin état (rare en chinage)", () => {
    const items = genererSession(20);
    const pristines = items.filter((i) => i.objet.etat === "Pristin état");
    expect(pristines.length).toBe(0);
  });

  it("chaque item a un UUID unique", () => {
    const items = genererSession(10);
    const ids = new Set(items.map((i) => i.id));
    expect(ids.size).toBe(items.length);
  });
});

describe("genererSession — pas de doublons rares/légendaires", () => {
  it("aucun template rare ou légendaire n'apparait deux fois", () => {
    // Plusieurs runs pour avoir des chances de tirer des rares
    for (let run = 0; run < 5; run++) {
      const items = genererSession(15);
      const rares = items
        .filter((i) => i.objet.rarete !== "commun")
        .map((i) => i.objet.templateId);
      expect(new Set(rares).size).toBe(rares.length);
    }
  });
});

describe("genererSession — brocante spécialisée", () => {
  it("respecte le quota d'au moins 50% d'items de la catégorie spécialisée", () => {
    const broc = createMockBrocante({
      specialisation: "Musique",
      taillePool: 10,
      tier: 2,
    });
    const items = genererSession(10, [], broc);
    const enMusique = items.filter(
      (i) => i.objet.categorie === "Musique",
    ).length;
    expect(enMusique).toBeGreaterThanOrEqual(Math.ceil(items.length * 0.5));
  });
});

describe("genererSession — déterminisme du statut initial", () => {
  it("tous les items ont statut=disponible, negociation=null, negociationsTentees=0", () => {
    const items = genererSession(8);
    for (const it of items) {
      expect(it.statut).toBe("disponible");
      expect(it.negociation).toBeNull();
      expect(it.negociationsTentees).toBe(0);
    }
  });
});

describe("genererSession — surcote bonimenteur", () => {
  it("SURCOTE_BONIMENTEUR vaut 1.35", () => {
    expect(SURCOTE_BONIMENTEUR).toBe(1.35);
  });

  it("les objets du bonimenteur sont surcotés (jamais de prix bradé)", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    const items = [];
    for (let s = 0; s < 30; s++) items.push(...genererSession(12, [], broc));
    const duBonimenteur = items.filter((it) => it.persona.archetype === "bonimenteur");
    expect(duBonimenteur.length).toBeGreaterThan(0);
    for (const it of duBonimenteur) {
      // facteur min 0.6 × surcote 1.35 = 0.81 ; tolérance de 1 € pour l'arrondi.
      expect(it.prixVendeur).toBeGreaterThanOrEqual(
        Math.round(it.objet.prixReferenceReel * 0.81) - 1,
      );
    }
  });
});

describe("genererSession — disquaire connaît la cote", () => {
  it("le disquaire n'apparaît que sur des objets Musique, jamais bradés", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    const items = [];
    for (let s = 0; s < 40; s++) items.push(...genererSession(12, [], broc));
    const duDisquaire = items.filter((it) => it.persona.archetype === "disquaire");
    expect(duDisquaire.length).toBeGreaterThan(0);
    for (const it of duDisquaire) {
      expect(it.objet.categorie).toBe("Musique");
      // facteurCoteMin 0.95 ; tolérance de 1 € pour l'arrondi.
      expect(it.prixVendeur).toBeGreaterThanOrEqual(
        Math.round(it.objet.prixReferenceReel * 0.95) - 1,
      );
    }
  });
});

describe("genererSession — commanditaires connaissent leur cote", () => {
  it("chaque commanditaire n'apparaît que sur sa catégorie, au-dessus de son plancher", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    const items = [];
    for (let s = 0; s < 40; s++) items.push(...genererSession(12, [], broc));
    const CAS = [
      { arch: "joueur", cat: "Jeux & Loisirs", min: 0.85 },
      { arch: "setdesigner", cat: "Maison", min: 0.8 },
      { arch: "modeuse", cat: "Mode", min: 0.95 },
      { arch: "esthete", cat: "Objets d'art", min: 0.95 },
    ] as const;
    for (const { arch, cat, min } of CAS) {
      const duSpe = items.filter((it) => it.persona.archetype === arch);
      expect(duSpe.length).toBeGreaterThan(0);
      for (const it of duSpe) {
        expect(it.objet.categorie).toBe(cat);
        // facteurCoteMin ; tolérance de 1 € pour l'arrondi.
        expect(it.prixVendeur).toBeGreaterThanOrEqual(
          Math.round(it.objet.prixReferenceReel * min) - 1,
        );
      }
    }
  });
});
