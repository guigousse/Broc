import { describe, expect, it } from "vitest";
import type { GameState } from "@/types/game";
import { migrerEtat, migrerSauvegarde } from "./migrations";
import { ID_LETTRE_MAMAN_DEBUT } from "./courrier";
import { createMockGameState } from "./__test-fixtures__/gameState";

describe("migrerEtat", () => {
  it("conserve les états valides", () => {
    expect(migrerEtat("Mauvais")).toBe("Mauvais");
    expect(migrerEtat("Bon")).toBe("Bon");
    expect(migrerEtat("Très bon")).toBe("Très bon");
    expect(migrerEtat("Pristin état")).toBe("Pristin état");
  });

  it("remappe l'ancien 'Comme neuf' en 'Très bon'", () => {
    expect(migrerEtat("Comme neuf")).toBe("Très bon");
  });

  it("fallback sur 'Bon' pour toute autre valeur inconnue", () => {
    expect(migrerEtat("Cassé")).toBe("Bon");
    expect(migrerEtat("")).toBe("Bon");
    expect(migrerEtat("junk")).toBe("Bon");
  });
});

describe("migrerSauvegarde — état complet déjà valide", () => {
  it("préserve un GameState déjà à jour", () => {
    const fresh = createMockGameState({ budget: 555, jourActuel: 12 });
    const migrated = migrerSauvegarde(fresh);
    expect(migrated.budget).toBe(555);
    expect(migrated.jourActuel).toBe(12);
  });

  it("injecte la lettre Maman si absente du save", () => {
    const fresh = createMockGameState();
    const migrated = migrerSauvegarde(fresh);
    expect(migrated.courriers.some((c) => c.id === ID_LETTRE_MAMAN_DEBUT)).toBe(
      true,
    );
    expect(migrated.declencheursDeclenches).toContain(ID_LETTRE_MAMAN_DEBUT);
  });

  it("n'injecte pas la lettre Maman si elle a déjà été distribuée", () => {
    const fresh = createMockGameState({
      declencheursDeclenches: [ID_LETTRE_MAMAN_DEBUT],
    });
    const migrated = migrerSauvegarde(fresh);
    expect(
      migrated.courriers.filter((c) => c.id === ID_LETTRE_MAMAN_DEBUT).length,
    ).toBe(0);
  });
});

describe("migrerSauvegarde — anciens champs manquants", () => {
  it("remplit niveauAtelier=1 par défaut", () => {
    const incomplete = {
      ...createMockGameState(),
      niveauAtelier: undefined,
    } as unknown as GameState;
    expect(migrerSauvegarde(incomplete).niveauAtelier).toBe(1);
  });

  it("garde niveauAtelier=2 si déjà à 2", () => {
    const state = createMockGameState({ niveauAtelier: 2 });
    expect(migrerSauvegarde(state).niveauAtelier).toBe(2);
  });

  it("fallback niveauStockage selon total stocké si valeur manquante", () => {
    const incomplete = {
      ...createMockGameState(),
      niveauStockage: undefined,
      inventaireJoueur: [],
    } as unknown as GameState;
    // 0 objets → tier 1
    expect(migrerSauvegarde(incomplete).niveauStockage).toBe(1);
  });

  it("génère une météo de semaine si absente ou de mauvaise longueur", () => {
    const state = createMockGameState({ meteoSemaine: [] });
    const m = migrerSauvegarde(state);
    expect(m.meteoSemaine.length).toBe(7);
  });

  it("génère une célébrité si absente", () => {
    const state = createMockGameState({ celebriteActuelle: null });
    const m = migrerSauvegarde(state);
    expect(m.celebriteActuelle).not.toBeNull();
    expect(m.celebriteActuelle?.brocanteId).toBeTruthy();
  });

  it("clampe passagesSansChat dans [0, 3]", () => {
    const state = createMockGameState({ passagesSansChat: 99 });
    expect(migrerSauvegarde(state).passagesSansChat).toBe(3);
  });

  it("traite passagesSansChat négatif ou non-fini comme 0", () => {
    const a = createMockGameState({ passagesSansChat: -5 });
    expect(migrerSauvegarde(a).passagesSansChat).toBe(0);
  });
});

describe("migrerSauvegarde — résilience aux structures corrompues", () => {
  it("tolère un inventaire manquant", () => {
    const corrupt = {
      ...createMockGameState(),
      inventaireJoueur: undefined,
    } as unknown as GameState;
    const m = migrerSauvegarde(corrupt);
    expect(Array.isArray(m.inventaireJoueur)).toBe(true);
  });

  it("tolère un historique manquant", () => {
    const corrupt = {
      ...createMockGameState(),
      historique: undefined,
    } as unknown as GameState;
    const m = migrerSauvegarde(corrupt);
    expect(Array.isArray(m.historique)).toBe(true);
  });

  it("renvoie une collection cohérente même sans collection persistée", () => {
    const corrupt = {
      ...createMockGameState(),
      collection: undefined,
    } as unknown as GameState;
    const m = migrerSauvegarde(corrupt);
    expect(m.collection).toBeDefined();
    expect(typeof m.collection).toBe("object");
  });
});

describe("migrerSauvegarde — purge des compétences obsolètes", () => {
  it("reset les arbres si une compétence débloquée n'existe plus dans le catalogue", () => {
    const state = createMockGameState({
      competencesDebloquees: ["catalogue.inexistante.999"],
    });
    const m = migrerSauvegarde(state);
    expect(m.competencesDebloquees).toEqual([]);
  });
});

describe("migrerSauvegarde — immutabilité", () => {
  it("ne mute pas le state d'entrée", () => {
    const fresh = createMockGameState({ budget: 100 });
    const snapshot = JSON.stringify(fresh);
    migrerSauvegarde(fresh);
    expect(JSON.stringify(fresh)).toBe(snapshot);
  });
});
