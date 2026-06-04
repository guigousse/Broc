import { describe, expect, it } from "vitest";
import type { CategorieObjet, CollectionSlot, Rarete } from "@/types/game";
import { CATEGORIES } from "@/data/categories";
import {
  collectionComplete,
  donnerObjet,
  initCollection,
  marquerDejaPossede,
  marquerVu,
  marquerVuDansCollection,
  progressionCategorie,
  progressionGlobale,
  retirerDonation,
  valeurParCategorie,
  valeurTotale,
} from "./collection";

function emptySlot(
  templateId: string,
  cat: CategorieObjet,
  rarete: Rarete = "commun",
): CollectionSlot {
  return {
    templateId,
    nom: `Objet ${templateId}`,
    categorie: cat,
    rarete,
    vu: false,
    dejaPossede: false,
    donation: null,
    unique: false,
    vuDansCollection: true,
  };
}

function emptyCollection(): Record<CategorieObjet, CollectionSlot[]> {
  const col = {} as Record<CategorieObjet, CollectionSlot[]>;
  for (const c of CATEGORIES) col[c] = [];
  return col;
}

function withSlots(
  slots: CollectionSlot[],
): Record<CategorieObjet, CollectionSlot[]> {
  const col = emptyCollection();
  for (const s of slots) col[s.categorie].push(s);
  return col;
}

describe("initCollection", () => {
  const collection = initCollection();

  it("contient toutes les catégories", () => {
    for (const c of CATEGORIES) {
      expect(collection[c]).toBeDefined();
      expect(Array.isArray(collection[c])).toBe(true);
    }
  });

  it("tous les slots commencent vides (vu=false, dejaPossede=false, donation=null)", () => {
    for (const c of CATEGORIES) {
      for (const s of collection[c]) {
        expect(s.vu).toBe(false);
        expect(s.dejaPossede).toBe(false);
        expect(s.donation).toBeNull();
      }
    }
  });

  it("trie chaque catégorie : commun avant rare avant legendaire", () => {
    const order = { commun: 0, rare: 1, legendaire: 2 };
    for (const c of CATEGORIES) {
      const slots = collection[c];
      for (let i = 1; i < slots.length; i++) {
        expect(order[slots[i - 1].rarete]).toBeLessThanOrEqual(
          order[slots[i].rarete],
        );
      }
    }
  });
});

describe("marquerVu", () => {
  it("passe vu à true et baisse vuDansCollection", () => {
    const col = withSlots([emptySlot("t1", "Musique")]);
    const next = marquerVu(col, "t1");
    expect(next.Musique[0].vu).toBe(true);
    expect(next.Musique[0].vuDansCollection).toBe(false);
  });

  it("est idempotent si déjà vu", () => {
    const col = withSlots([
      { ...emptySlot("t1", "Musique"), vu: true, vuDansCollection: false },
    ]);
    const next = marquerVu(col, "t1");
    expect(next).toBe(col);
  });

  it("ne modifie pas la collection si le templateId est inconnu", () => {
    const col = withSlots([emptySlot("t1", "Musique")]);
    const next = marquerVu(col, "inconnu");
    expect(next).toBe(col);
  });
});

describe("marquerDejaPossede", () => {
  it("passe dejaPossede à true et vu à true", () => {
    const col = withSlots([emptySlot("t1", "Musique")]);
    const next = marquerDejaPossede(col, "t1");
    expect(next.Musique[0].dejaPossede).toBe(true);
    expect(next.Musique[0].vu).toBe(true);
  });

  it("baisse vuDansCollection à false lors du premier passage à vu", () => {
    const col = withSlots([emptySlot("t1", "Musique")]);
    const next = marquerDejaPossede(col, "t1");
    expect(next.Musique[0].vuDansCollection).toBe(false);
  });

  it("est idempotent si déjà possédé et vu", () => {
    const col = withSlots([
      {
        ...emptySlot("t1", "Musique"),
        vu: true,
        dejaPossede: true,
        vuDansCollection: false,
      },
    ]);
    const next = marquerDejaPossede(col, "t1");
    expect(next).toBe(col);
  });
});

describe("marquerVuDansCollection", () => {
  it("efface le badge nouveau", () => {
    const col = withSlots([
      { ...emptySlot("t1", "Musique"), vu: true, vuDansCollection: false },
    ]);
    const next = marquerVuDansCollection(col, "t1");
    expect(next.Musique[0].vuDansCollection).toBe(true);
  });
});

describe("donnerObjet", () => {
  it("pose une donation dans un slot vide, ancienne = null", () => {
    const col = withSlots([emptySlot("t1", "Musique")]);
    const res = donnerObjet(col, "t1", "Bon", 50);
    expect(res.collection.Musique[0].donation).toEqual({ etat: "Bon", valeur: 50 });
    expect(res.collection.Musique[0].vu).toBe(true);
    expect(res.collection.Musique[0].dejaPossede).toBe(true);
    expect(res.ancienne).toBeNull();
  });

  it("remplace une donation et retourne l'ancienne", () => {
    const col = withSlots([
      {
        ...emptySlot("t1", "Musique"),
        donation: { etat: "Mauvais", valeur: 10 },
      },
    ]);
    const res = donnerObjet(col, "t1", "Pristin état", 200);
    expect(res.collection.Musique[0].donation).toEqual({
      etat: "Pristin état",
      valeur: 200,
    });
    expect(res.ancienne).toEqual({ etat: "Mauvais", valeur: 10 });
  });
});

describe("retirerDonation", () => {
  it("retire la donation et retourne l'ancienne", () => {
    const col = withSlots([
      {
        ...emptySlot("t1", "Musique"),
        donation: { etat: "Très bon", valeur: 80 },
      },
    ]);
    const res = retirerDonation(col, "t1");
    expect(res.collection.Musique[0].donation).toBeNull();
    expect(res.ancienne).toEqual({ etat: "Très bon", valeur: 80 });
  });

  it("ne change rien si pas de donation", () => {
    const col = withSlots([emptySlot("t1", "Musique")]);
    const res = retirerDonation(col, "t1");
    expect(res.collection).toBe(col);
    expect(res.ancienne).toBeNull();
  });
});

describe("valeurTotale & valeurParCategorie", () => {
  it("somme les donations sur toute la collection", () => {
    const col = withSlots([
      { ...emptySlot("t1", "Musique"), donation: { etat: "Bon", valeur: 10 } },
      { ...emptySlot("t2", "Musique"), donation: { etat: "Bon", valeur: 30 } },
      { ...emptySlot("t3", "Mode"), donation: { etat: "Bon", valeur: 50 } },
      { ...emptySlot("t4", "Mode") }, // sans donation
    ]);
    expect(valeurTotale(col)).toBe(90);
    expect(valeurParCategorie(col, "Musique")).toBe(40);
    expect(valeurParCategorie(col, "Mode")).toBe(50);
    expect(valeurParCategorie(col, "Maison")).toBe(0);
  });
});

describe("progressionCategorie & progressionGlobale", () => {
  it("compte vues, données et valeur par catégorie", () => {
    const col = withSlots([
      { ...emptySlot("t1", "Musique"), vu: true },
      {
        ...emptySlot("t2", "Musique"),
        vu: true,
        donation: { etat: "Bon", valeur: 20 },
      },
      { ...emptySlot("t3", "Musique") },
    ]);
    const p = progressionCategorie(col, "Musique");
    expect(p.total).toBe(3);
    expect(p.vues).toBe(2);
    expect(p.donnees).toBe(1);
    expect(p.valeur).toBe(20);
  });

  it("progressionGlobale agrège toutes les catégories", () => {
    const col = withSlots([
      { ...emptySlot("t1", "Musique"), donation: { etat: "Bon", valeur: 10 } },
      { ...emptySlot("t2", "Mode"), donation: { etat: "Bon", valeur: 20 } },
    ]);
    const g = progressionGlobale(col);
    expect(g.total).toBe(2);
    expect(g.donnees).toBe(2);
    expect(g.valeur).toBe(30);
  });
});

describe("collectionComplete", () => {
  it("retourne false sur une collection vide", () => {
    expect(collectionComplete(emptyCollection())).toBe(false);
  });

  it("retourne false si au moins un slot n'a pas de donation", () => {
    const col = withSlots([
      { ...emptySlot("t1", "Musique"), donation: { etat: "Bon", valeur: 10 } },
      { ...emptySlot("t2", "Mode") },
    ]);
    expect(collectionComplete(col)).toBe(false);
  });

  it("retourne true si tous les slots ont une donation", () => {
    const col = withSlots([
      { ...emptySlot("t1", "Musique"), donation: { etat: "Bon", valeur: 10 } },
      { ...emptySlot("t2", "Mode"), donation: { etat: "Bon", valeur: 20 } },
    ]);
    expect(collectionComplete(col)).toBe(true);
  });
});

describe("immutabilité", () => {
  it("ne mute pas la collection d'origine sur donnerObjet", () => {
    const col = withSlots([emptySlot("t1", "Musique")]);
    const snapshot = JSON.stringify(col);
    donnerObjet(col, "t1", "Bon", 50);
    expect(JSON.stringify(col)).toBe(snapshot);
  });

  it("ne mute pas la collection d'origine sur marquerVu", () => {
    const col = withSlots([emptySlot("t1", "Musique")]);
    const snapshot = JSON.stringify(col);
    marquerVu(col, "t1");
    expect(JSON.stringify(col)).toBe(snapshot);
  });
});
