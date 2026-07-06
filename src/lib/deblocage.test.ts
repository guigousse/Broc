import { describe, expect, it } from "vitest";
import type { CategorieObjet, ConditionDeblocage, Session } from "@/types/game";
import {
  BROCANTES,
  getBrocanteById,
  NIVEAU_BROCANTES_T2,
  NIVEAU_BROCANTES_T3,
  NIVEAU_BROCANTES_T4,
} from "@/data/brocantes";
import {
  calculerBrocantesDebloqueesParTier,
  descriptionCondition,
  estDebloquee,
  evaluerCondition,
} from "./deblocage";
import {
  createMockBrocante,
  createMockGameState,
  createMockSlot,
} from "./__test-fixtures__/gameState";

function withCondition(c: ConditionDeblocage) {
  return createMockBrocante({ conditionDeblocage: c });
}

function venteSession(cat: CategorieObjet, n = 1): Session {
  const ventes = Array.from({ length: n }, (_, i) => ({
    id: `v-${i}`,
    templateId: "t",
    nom: "objet",
    categorie: cat,
    rarete: "commun" as const,
    etat: "Bon" as const,
    prixReferenceReel: 100,
    prixVente: 80,
    prixAchat: 50,
  }));
  return {
    id: "s1",
    type: "vente",
    jour: 1,
    timestamp: 0,
    niveauCamion: 1,
    loyer: 0,
    ventes,
    invendus: 0,
    xpGagne: {},
  };
}

describe("descriptionCondition", () => {
  it("formate chaque type", () => {
    expect(descriptionCondition({ type: "depart" })).toMatch(/départ/i);
    expect(descriptionCondition({ type: "jour", jour: 5 })).toMatch(/5/);
    expect(descriptionCondition({ type: "budget", montant: 200 })).toMatch(
      /200/,
    );
    expect(
      descriptionCondition({
        type: "ventesCategorie",
        categorie: "Musique",
        nombre: 3,
      }),
    ).toMatch(/Musique/);
    expect(
      descriptionCondition({
        type: "brocantesDebloquees",
        tier: 2,
        nombre: 4,
      }),
    ).toMatch(/4/);
    expect(
      descriptionCondition({ type: "valeurCollection", montant: 500 }),
    ).toMatch(/500/);
    expect(
      descriptionCondition({
        type: "valeurCollectionCategorie",
        categorie: "Mode",
        montant: 100,
      }),
    ).toMatch(/Mode/);
  });

  it("ET concatène les sous-descriptions", () => {
    const s = descriptionCondition({
      type: "ET",
      conditions: [
        { type: "jour", jour: 5 },
        { type: "budget", montant: 200 },
      ],
    });
    expect(s).toMatch(/5/);
    expect(s).toMatch(/200/);
  });

  it("singulier vs pluriel sur ventesCategorie", () => {
    expect(
      descriptionCondition({
        type: "ventesCategorie",
        categorie: "Musique",
        nombre: 1,
      }),
    ).not.toMatch(/ventes/);
    expect(
      descriptionCondition({
        type: "ventesCategorie",
        categorie: "Musique",
        nombre: 2,
      }),
    ).toMatch(/ventes/);
  });
});

describe("estDebloquee — type depart", () => {
  it("toujours vrai", () => {
    expect(estDebloquee(withCondition({ type: "depart" }), createMockGameState())).toBe(
      true,
    );
  });
});

describe("estDebloquee — type jour", () => {
  it("vrai si jourActuel >= jour", () => {
    expect(
      estDebloquee(
        withCondition({ type: "jour", jour: 5 }),
        createMockGameState({ jourActuel: 5 }),
      ),
    ).toBe(true);
    expect(
      estDebloquee(
        withCondition({ type: "jour", jour: 5 }),
        createMockGameState({ jourActuel: 10 }),
      ),
    ).toBe(true);
  });

  it("faux si jourActuel < jour", () => {
    expect(
      estDebloquee(
        withCondition({ type: "jour", jour: 5 }),
        createMockGameState({ jourActuel: 4 }),
      ),
    ).toBe(false);
  });
});

describe("estDebloquee — type budget", () => {
  it("vrai si budget >= montant", () => {
    expect(
      estDebloquee(
        withCondition({ type: "budget", montant: 200 }),
        createMockGameState({ budget: 200 }),
      ),
    ).toBe(true);
  });

  it("faux si budget < montant", () => {
    expect(
      estDebloquee(
        withCondition({ type: "budget", montant: 200 }),
        createMockGameState({ budget: 199 }),
      ),
    ).toBe(false);
  });
});

describe("estDebloquee — type ventesCategorie", () => {
  it("compte les ventes de la catégorie dans l'historique", () => {
    const state = createMockGameState({
      historique: [venteSession("Musique", 3)],
    });
    expect(
      estDebloquee(
        withCondition({ type: "ventesCategorie", categorie: "Musique", nombre: 3 }),
        state,
      ),
    ).toBe(true);
    expect(
      estDebloquee(
        withCondition({ type: "ventesCategorie", categorie: "Musique", nombre: 4 }),
        state,
      ),
    ).toBe(false);
  });

  it("ne compte pas les ventes des autres catégories", () => {
    const state = createMockGameState({
      historique: [venteSession("Mode", 5)],
    });
    expect(
      estDebloquee(
        withCondition({ type: "ventesCategorie", categorie: "Musique", nombre: 1 }),
        state,
      ),
    ).toBe(false);
  });
});

describe("estDebloquee — type brocantesDebloquees", () => {
  it("utilise le map externe brocantesDebloqueesParTier", () => {
    const broc = withCondition({
      type: "brocantesDebloquees",
      tier: 1,
      nombre: 2,
    });
    const map = new Map<1 | 2 | 3 | 4, Set<string>>([
      [1, new Set(["b1", "b2", "b3"])],
    ]);
    expect(estDebloquee(broc, createMockGameState(), map)).toBe(true);
    const mapPetit = new Map<1 | 2 | 3 | 4, Set<string>>([
      [1, new Set(["b1"])],
    ]);
    expect(estDebloquee(broc, createMockGameState(), mapPetit)).toBe(false);
  });

  it("retourne false si le map est absent ou ne contient pas le tier", () => {
    const broc = withCondition({
      type: "brocantesDebloquees",
      tier: 2,
      nombre: 1,
    });
    expect(estDebloquee(broc, createMockGameState())).toBe(false);
  });
});

describe("calculerBrocantesDebloqueesParTier", () => {
  it("débloque en cascade les brocantes à condition brocantesDebloquees", () => {
    // 200 € en Livres → tier 1 : vide-grenier (départ), marché aux puces
    // (valeur 30), bouquinerie (Livres 20) = 3 débloquées → le Déballage des
    // collectionneurs (valeur 150 + 3 brocantes 1⭐ + niveau T2) doit suivre.
    const state = createMockGameState({
      brocanteur: { xp: 0, niveau: NIVEAU_BROCANTES_T2, pointsDisponibles: 0 },
    });
    state.collection["Livres & Papeterie"] = [
      createMockSlot({ donation: { etat: "Bon", valeur: 200 } }),
    ];
    const map = calculerBrocantesDebloqueesParTier(state);
    expect(map.get(1)!.size).toBe(3);
    expect(map.get(2)!.has("deballage-collectionneurs")).toBe(true);
    const deballage = getBrocanteById("deballage-collectionneurs")!;
    expect(estDebloquee(deballage, state, map)).toBe(true);
  });

  it("garde verrouillée une brocante dont le quota de tier n'est pas atteint", () => {
    // 160 € en Maison → seulement 2 brocantes 1⭐ (départ + valeur 30) :
    // le Déballage reste verrouillé malgré valeurCollection >= 150.
    const state = createMockGameState();
    state.collection["Maison"] = [
      createMockSlot({ donation: { etat: "Bon", valeur: 160 } }),
    ];
    const map = calculerBrocantesDebloqueesParTier(state);
    expect(map.get(1)!.size).toBe(2);
    expect(map.get(2)!.has("deballage-collectionneurs")).toBe(false);
  });
});

describe("estDebloquee — type valeurCollection", () => {
  it("vrai si valeurTotale >= montant", () => {
    const slot = createMockSlot({
      donation: { etat: "Bon", valeur: 100 },
    });
    const state = createMockGameState();
    state.collection["Musique"] = [slot];
    expect(
      estDebloquee(
        withCondition({ type: "valeurCollection", montant: 100 }),
        state,
      ),
    ).toBe(true);
    expect(
      estDebloquee(
        withCondition({ type: "valeurCollection", montant: 200 }),
        state,
      ),
    ).toBe(false);
  });
});

describe("estDebloquee — type ET (composition)", () => {
  it("ET = AND logique", () => {
    const broc = withCondition({
      type: "ET",
      conditions: [
        { type: "jour", jour: 5 },
        { type: "budget", montant: 200 },
      ],
    });
    expect(
      estDebloquee(broc, createMockGameState({ jourActuel: 5, budget: 200 })),
    ).toBe(true);
    expect(
      estDebloquee(broc, createMockGameState({ jourActuel: 4, budget: 200 })),
    ).toBe(false);
    expect(
      estDebloquee(broc, createMockGameState({ jourActuel: 5, budget: 199 })),
    ).toBe(false);
  });

  it("ET avec conditions=[] = vrai trivialement", () => {
    expect(
      estDebloquee(
        withCondition({ type: "ET", conditions: [] }),
        createMockGameState(),
      ),
    ).toBe(true);
  });
});

describe("evaluerCondition (exporté)", () => {
  it("retourne true pour la condition depart", () => {
    expect(evaluerCondition({ type: "depart" }, createMockGameState())).toBe(true);
  });
});

function fabriqueState(patch: { niveau: number }) {
  return createMockGameState({
    brocanteur: { xp: 0, niveau: patch.niveau, pointsDisponibles: 0 },
  });
}

describe("condition niveau (double gate)", () => {
  it("évalue le niveau de Brocanteur", () => {
    const cond = { type: "niveau", niveau: 4 } as const;
    expect(evaluerCondition(cond, fabriqueState({ niveau: 3 }))).toBe(false);
    expect(evaluerCondition(cond, fabriqueState({ niveau: 4 }))).toBe(true);
  });

  it("décrit la condition", () => {
    expect(descriptionCondition({ type: "niveau", niveau: 10 })).toContain("Niveau de Brocanteur 10");
  });

  it("toutes les brocantes T2/T3/T4 exigent le niveau du tier", () => {
    for (const b of BROCANTES) {
      if (b.tier === 1) continue;
      const attendu = { 2: NIVEAU_BROCANTES_T2, 3: NIVEAU_BROCANTES_T3, 4: NIVEAU_BROCANTES_T4 }[b.tier];
      const c = b.conditionDeblocage;
      expect(c.type).toBe("ET");
      const niveaux = (c.type === "ET" ? c.conditions : []).filter((x) => x.type === "niveau");
      expect(niveaux).toEqual([{ type: "niveau", niveau: attendu }]);
    }
  });

  it("ne lève pas si `brocanteur` est absent (save passée par le lifeboat de migration) : traite comme niveau 0", () => {
    const stateSansBrocanteur = {
      ...createMockGameState(),
      brocanteur: undefined,
    } as unknown as Parameters<typeof evaluerCondition>[1];
    expect(
      evaluerCondition({ type: "niveau", niveau: 4 }, stateSansBrocanteur),
    ).toBe(false);
  });
});
