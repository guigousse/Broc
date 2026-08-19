import { describe, expect, it } from "vitest";
import { appliquerRecompense, recompenseEffective } from "./recompenses";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { CourrierPayloadMission, MissionCategorie } from "@/types/game";

function mission(patch: Partial<CourrierPayloadMission> = {}): CourrierPayloadMission {
  return {
    type: "mission", categorie: "quotidienne", expediteurId: "maman",
    titre: "T", corps: [], cibles: [], recompense: { argent: 30 },
    ...patch,
  };
}

describe("XP de quête", () => {
  it("AUCUNE catégorie ne verse d'XP (décision de design 2026-08-18)", () => {
    // Les jetons « Bazar » prendront cette place. La règle est vérifiée sur
    // les trois catégories réelles PLUS une catégorie inconnue, le chemin
    // qu'emprunterait une vieille save non purgée : aucune ne doit rouvrir
    // une porte vers l'XP.
    for (const categorie of ["quotidienne", "hebdomadaire", "principale", "mensuelle"]) {
      const r = recompenseEffective(mission({ categorie: categorie as MissionCategorie }));
      expect(r.xp, `catégorie ${categorie}`).toBe(0);
    }
  });
});

describe("recompenseEffective", () => {
  it("xp absent : zéro, pas un défaut de catégorie", () => {
    const r = recompenseEffective(mission({ categorie: "principale", recompense: { argent: 200 } }));
    expect(r).toEqual({ argent: 200, xp: 0, energie: 0, jetons: 0 });
  });

  it("respecte un xp explicite, y compris 0", () => {
    expect(recompenseEffective(mission({ recompense: { argent: 30, xp: 300 } })).xp).toBe(300);
    expect(recompenseEffective(mission({ recompense: { argent: 30, xp: 0 } })).xp).toBe(0);
  });

  it("énergie absente → 0, explicite → conservée", () => {
    expect(recompenseEffective(mission()).energie).toBe(0);
    expect(recompenseEffective(mission({ recompense: { argent: 30, energie: 2 } })).energie).toBe(2);
  });

  it("catégorie inconnue : pas de NaN (zéro sûr, pas d'undefined)", () => {
    // Le risque d'origine n'a pas disparu avec les constantes : c'est
    // `b.xp + undefined` qui NaN-poisonnerait la save. Zéro est un nombre.
    const r = recompenseEffective(mission({ categorie: "mensuelle" as MissionCategorie }));
    expect(r).toEqual({ argent: 30, xp: 0, energie: 0, jetons: 0 });
    expect(Number.isNaN(r.xp)).toBe(false);
  });
});

const LEDGER = { designation: "Mission · T", courrierId: "m1" };

describe("appliquerRecompense", () => {
  it("crédite l'argent au grand livre avec params xp/énergie", () => {
    const s = createMockGameState({ budget: 100 });
    const next = appliquerRecompense(s, { argent: 50, xp: 25, energie: 2, jetons: 0 }, LEDGER, 0);
    expect(next.budget).toBe(150);
    const e = next.grandLivre.at(-1)!;
    expect(e.kind).toBe("mission_recompense");
    expect(e.recette).toBe(50);
    expect(e.params).toMatchObject({ courrierId: "m1", xp: 25, energie: 2 });
  });

  it("verse l'XP au brocanteur", () => {
    const s = createMockGameState();
    const next = appliquerRecompense(s, { argent: 0, xp: 40, energie: 0, jetons: 0 }, LEDGER, 0);
    expect(next.brocanteur.xp).toBe(s.brocanteur.xp + 40);
  });

  it("énergie : settle d'abord, puis gain avec débordement (4 + 2 → 6)", () => {
    const s = createMockGameState({ energie: 4, energieDerniereMaj: 0 });
    const next = appliquerRecompense(s, { argent: 0, xp: 0, energie: 2, jetons: 0 }, LEDGER, 0);
    expect(next.energie).toBe(6);
  });

  it("énergie bornée par ENERGIE_PLAFOND (9 + 5 → 10)", () => {
    const s = createMockGameState({ energie: 9, energieDerniereMaj: 0 });
    const next = appliquerRecompense(s, { argent: 0, xp: 0, energie: 5, jetons: 0 }, LEDGER, 0);
    expect(next.energie).toBe(10);
  });

  it("gain d'énergie nul : le settle est volontairement SAUTÉ (energie ET energieDerniereMaj inchangés)", () => {
    // energieDerniereMaj ancienne : si le settle avait lieu, `now` (10 000)
    // la ferait avancer. On vérifie qu'elle ne bouge PAS — preuve que
    // `appliquerRecompense` court-circuite bien le settle quand energie === 0.
    const s = createMockGameState({ energie: 3, energieDerniereMaj: 0 });
    const next = appliquerRecompense(s, { argent: 10, xp: 10, energie: 0, jetons: 0 }, LEDGER, 10_000);
    expect(next.energie).toBe(3);
    expect(next.energieDerniereMaj).toBe(0);
  });
});

describe("jetons du Bazar", () => {
  it("recompenseEffective remonte les jetons du payload", () => {
    const payload = {
      type: "mission" as const,
      categorie: "quotidienne" as const,
      expediteurId: "x",
      titre: "t",
      corps: [],
      cibles: [],
      recompense: { argent: 25, jetons: 1 },
    };
    expect(recompenseEffective(payload).jetons).toBe(1);
  });

  it("un payload sans jetons vaut 0 — jamais undefined", () => {
    const payload = {
      type: "mission" as const,
      categorie: "quotidienne" as const,
      expediteurId: "x",
      titre: "t",
      corps: [],
      cibles: [],
      recompense: { argent: 25 },
    };
    expect(recompenseEffective(payload).jetons).toBe(0);
  });

  it("appliquerRecompense crédite le solde de jetons", () => {
    const state = createMockGameState({ jetons: 4 });
    const next = appliquerRecompense(
      state,
      { argent: 0, xp: 0, energie: 0, jetons: 3 },
      { designation: "d", courrierId: "c1" },
      Date.now(),
    );
    expect(next.jetons).toBe(7);
  });

  it("les jetons ne touchent pas les colonnes en euros du grand livre", () => {
    const state = createMockGameState({ jetons: 0, budget: 100 });
    const next = appliquerRecompense(
      state,
      { argent: 0, xp: 0, energie: 0, jetons: 3 },
      { designation: "d", courrierId: "c1" },
      Date.now(),
    );
    const ecriture = next.grandLivre[next.grandLivre.length - 1];
    expect(ecriture.recette).toBe(0);
    expect(ecriture.depense).toBe(0);
    expect(ecriture.params?.jetons).toBe(3);
  });
});
