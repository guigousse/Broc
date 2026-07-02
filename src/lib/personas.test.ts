import { describe, expect, it } from "vitest";
import {
  NOM_ARCHETYPE,
  NOM_VENDEUR,
  calculerPrixMinAcceptDepuisPersona,
  getAffiniteCategorie,
  getNomVendeur,
  tirerPersonaVendeur,
} from "./personas";
import { createMockBrocante } from "./__test-fixtures__/gameState";
import { EXPEDITEURS } from "@/data/expediteursCourrier";

describe("NOM_ARCHETYPE", () => {
  it("a une entrée par archétype vendeur", () => {
    expect(NOM_ARCHETYPE.naif).toBeTruthy();
    expect(NOM_ARCHETYPE.bonhomme).toBeTruthy();
    expect(NOM_ARCHETYPE.mamie).toBeTruthy();
    expect(NOM_ARCHETYPE.malin).toBeTruthy();
    expect(NOM_ARCHETYPE.grincheux).toBeTruthy();
    expect(NOM_ARCHETYPE.antiquaire).toBeTruthy();
  });

  it("tous les noms sont distincts", () => {
    const noms = new Set(Object.values(NOM_ARCHETYPE));
    expect(noms.size).toBe(Object.keys(NOM_ARCHETYPE).length);
  });
});

describe("tirerPersonaVendeur — structure", () => {
  it("retourne un NegoPersona valide pour brocante=undefined", () => {
    const p = tirerPersonaVendeur(undefined);
    expect(p.archetype).toBeTruthy();
    expect(p.margePct).toBeGreaterThanOrEqual(0);
    expect(p.margePct).toBeLessThanOrEqual(1);
    expect(p.elanPct).toBeGreaterThanOrEqual(0);
    expect(p.elanPct).toBeLessThanOrEqual(1);
    expect(p.patience).toBeGreaterThanOrEqual(2);
    expect(p.tolerancePct).toBeGreaterThanOrEqual(0);
    expect(p.tolerancePct).toBeLessThanOrEqual(1);
    expect(p.sangFroid).toBeGreaterThanOrEqual(0);
    expect(p.sangFroid).toBeLessThanOrEqual(1);
  });

  it("patience est un entier >= 2", () => {
    for (let i = 0; i < 20; i++) {
      const p = tirerPersonaVendeur(undefined);
      expect(Number.isInteger(p.patience)).toBe(true);
      expect(p.patience).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("tirerPersonaVendeur — tier 4 favorise antiquaire", () => {
  it("sur 50 tirages tier 4, l'antiquaire est majoritaire", () => {
    const broc = createMockBrocante({ tier: 4, etoiles: 4 });
    const counts: Record<string, number> = {};
    for (let i = 0; i < 50; i++) {
      const p = tirerPersonaVendeur(broc);
      counts[p.archetype] = (counts[p.archetype] ?? 0) + 1;
    }
    const antiquaire = counts.antiquaire ?? 0;
    expect(antiquaire).toBeGreaterThanOrEqual(20); // ~60% attendu
  });
});

describe("tirerPersonaVendeur — tier 1 jamais antiquaire", () => {
  it("sur 100 tirages tier 1 sans ambiance, antiquaire ne sort pas (poids 0)", () => {
    const broc = createMockBrocante({ tier: 1, etoiles: 1, ambiance: "" });
    for (let i = 0; i < 100; i++) {
      const p = tirerPersonaVendeur(broc);
      expect(p.archetype).not.toBe("antiquaire");
    }
  });
});

describe("calculerPrixMinAcceptDepuisPersona", () => {
  it("prix min = prixVendeur × (1 - margePct)", () => {
    expect(
      calculerPrixMinAcceptDepuisPersona(
        {
          archetype: "test",
          margePct: 0.2,
          elanPct: 0.3,
          patience: 5,
          tolerancePct: 0.2,
          sangFroid: 0.5,
        },
        100,
      ),
    ).toBe(80);
  });

  it("ne descend jamais sous 1", () => {
    expect(
      calculerPrixMinAcceptDepuisPersona(
        {
          archetype: "test",
          margePct: 1, // 100% de marge
          elanPct: 0,
          patience: 5,
          tolerancePct: 0,
          sangFroid: 0,
        },
        50,
      ),
    ).toBeGreaterThanOrEqual(1);
  });

  it("retourne un entier", () => {
    const p = calculerPrixMinAcceptDepuisPersona(
      {
        archetype: "test",
        margePct: 0.37,
        elanPct: 0.3,
        patience: 5,
        tolerancePct: 0.2,
        sangFroid: 0.5,
      },
      137,
    );
    expect(Number.isInteger(p)).toBe(true);
  });
});

describe("NOM_VENDEUR", () => {
  const archetypes = [
    "naif", "bonhomme", "mamie", "malin", "grincheux", "antiquaire",
    "pipelette", "videcave", "bonimenteur", "disquaire",
  ] as const;

  it("a un nom pour chacun des 10 archétypes", () => {
    for (const a of archetypes) {
      expect(NOM_VENDEUR[a]).toBeTruthy();
    }
  });

  it("tous les noms sont distincts", () => {
    const noms = new Set(Object.values(NOM_VENDEUR));
    expect(noms.size).toBe(Object.keys(NOM_VENDEUR).length);
  });

  it("les noms validés par la spec", () => {
    expect(NOM_VENDEUR.naif).toBe("P'tit Lucien");
    expect(NOM_VENDEUR.bonhomme).toBe("Dédé la Bretelle");
    expect(NOM_VENDEUR.mamie).toBe("Mamie Odette");
    expect(NOM_VENDEUR.malin).toBe("Anatole la Combine");
    expect(NOM_VENDEUR.grincheux).toBe("Père Anselme");
    expect(NOM_VENDEUR.antiquaire).toBe("Madame Vasseur");
    expect(NOM_VENDEUR.pipelette).toBe("Tata Monique");
    expect(NOM_VENDEUR.videcave).toBe("Jeannot Vide-Cave");
    expect(NOM_VENDEUR.bonimenteur).toBe("Oscar la Tchatche");
    expect(NOM_VENDEUR.disquaire).toBe("Barnabé 33-Tours");
  });
});

describe("getNomVendeur", () => {
  it("retourne le nom du personnage", () => {
    expect(getNomVendeur("grincheux")).toBe("Père Anselme");
  });

  it("retombe sur « Un vendeur » pour un archétype inconnu", () => {
    expect(getNomVendeur("inconnu")).toBe("Un vendeur");
  });
});

describe("tirerPersonaVendeur — nouveaux archétypes", () => {
  it("les nouveaux archétypes courants sortent en tier 1", () => {
    const broc = createMockBrocante({ tier: 1, etoiles: 1, ambiance: "" });
    const counts: Record<string, number> = {};
    for (let i = 0; i < 300; i++) {
      const p = tirerPersonaVendeur(broc);
      counts[p.archetype] = (counts[p.archetype] ?? 0) + 1;
    }
    // pipelette poids 14 et videcave poids 10 sur ~148 : quasi impossible de ne jamais sortir en 300 tirages.
    expect(counts.pipelette ?? 0).toBeGreaterThan(0);
    expect(counts.videcave ?? 0).toBeGreaterThan(0);
  });

  it("le disquaire ne sort jamais sans catégorie (poids 0 partout)", () => {
    for (const tier of [1, 2, 3, 4] as const) {
      const broc = createMockBrocante({ tier, etoiles: tier, ambiance: "" });
      for (let i = 0; i < 100; i++) {
        expect(tirerPersonaVendeur(broc).archetype).not.toBe("disquaire");
      }
    }
  });
});

describe("affinité de catégorie", () => {
  it("getAffiniteCategorie décrit le disquaire et rien pour les autres", () => {
    expect(getAffiniteCategorie("disquaire")).toEqual({
      categorie: "Musique",
      boostPoids: 25,
      facteurCoteMin: 0.95,
    });
    expect(getAffiniteCategorie("naif")).toBeUndefined();
    expect(getAffiniteCategorie("inconnu")).toBeUndefined();
  });

  it("le disquaire ne sort jamais sur une catégorie ≠ Musique", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    for (let i = 0; i < 200; i++) {
      const p = tirerPersonaVendeur(broc, "Maison");
      expect(p.archetype).not.toBe("disquaire");
    }
  });

  it("le disquaire sort régulièrement sur Musique", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    let disquaire = 0;
    for (let i = 0; i < 300; i++) {
      if (tirerPersonaVendeur(broc, "Musique").archetype === "disquaire") disquaire++;
    }
    // boost 25 sur 126 de poids total tier 2 (151 avec le boost) → ~16,6 % attendu ; ≥ 5 est très conservateur.
    expect(disquaire).toBeGreaterThanOrEqual(5);
  });

  it("le biais d'ambiance Vinyle ne fait pas sortir le disquaire hors Musique", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "Vinyle" });
    for (let i = 0; i < 200; i++) {
      const p = tirerPersonaVendeur(broc, "Maison");
      expect(p.archetype).not.toBe("disquaire");
    }
  });
});

describe("commanditaires vendeurs", () => {
  const CAS = [
    { arch: "joueur", expediteur: "jeux-video", cat: "Jeux & Loisirs", mauvaise: "Maison" },
    { arch: "setdesigner", expediteur: "set-designer", cat: "Maison", mauvaise: "Mode" },
    { arch: "modeuse", expediteur: "mode", cat: "Mode", mauvaise: "Jeux & Loisirs" },
    { arch: "esthete", expediteur: "art", cat: "Objets d'art", mauvaise: "Musique" },
  ] as const;

  it("les noms sont dérivés des expéditeurs de courrier", () => {
    for (const { arch, expediteur } of CAS) {
      expect(NOM_VENDEUR[arch]).toBe(EXPEDITEURS[expediteur].nom);
    }
  });

  it("getAffiniteCategorie décrit les 4 commanditaires", () => {
    expect(getAffiniteCategorie("joueur")).toEqual({ categorie: "Jeux & Loisirs", boostPoids: 25, facteurCoteMin: 0.85 });
    expect(getAffiniteCategorie("setdesigner")).toEqual({ categorie: "Maison", boostPoids: 25, facteurCoteMin: 0.80 });
    expect(getAffiniteCategorie("modeuse")).toEqual({ categorie: "Mode", boostPoids: 25, facteurCoteMin: 0.95 });
    expect(getAffiniteCategorie("esthete")).toEqual({ categorie: "Objets d'art", boostPoids: 25, facteurCoteMin: 0.95 });
  });

  it("un commanditaire ne sort jamais hors de sa catégorie", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    for (const { arch, mauvaise } of CAS) {
      for (let i = 0; i < 150; i++) {
        expect(tirerPersonaVendeur(broc, mauvaise).archetype).not.toBe(arch);
      }
    }
  });

  it("les biais Geek et Mondain ne font pas fuiter joueur/esthete hors catégorie", () => {
    const geek = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "Geek" });
    const mondain = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "Mondain" });
    for (let i = 0; i < 150; i++) {
      expect(tirerPersonaVendeur(geek, "Musique").archetype).not.toBe("joueur");
      expect(tirerPersonaVendeur(mondain, "Mode").archetype).not.toBe("esthete");
    }
  });

  it("chaque commanditaire sort régulièrement sur sa catégorie", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    for (const { arch, cat } of CAS) {
      let n = 0;
      for (let i = 0; i < 300; i++) {
        if (tirerPersonaVendeur(broc, cat).archetype === arch) n++;
      }
      // boost 25 sur 126 de poids total tier 2 (151 avec le boost) → ~16,6 % attendu ; ≥ 5 est très conservateur.
      expect(n).toBeGreaterThanOrEqual(5);
    }
  });
});
