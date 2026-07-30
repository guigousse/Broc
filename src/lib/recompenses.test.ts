import { describe, expect, it } from "vitest";
import { appliquerRecompense, recompenseEffective, xpParDefaut } from "./recompenses";
import { XP_QUETE_HEBDO, XP_QUETE_PRINCIPALE, XP_QUETE_QUOTIDIENNE } from "@/lib/xp";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { CourrierPayloadMission } from "@/types/game";

function mission(patch: Partial<CourrierPayloadMission> = {}): CourrierPayloadMission {
  return {
    type: "mission", categorie: "quotidienne", expediteurId: "maman",
    titre: "T", corps: [], cibles: [], recompense: { argent: 30 },
    ...patch,
  };
}

describe("xpParDefaut", () => {
  it("suit les constantes de catégorie", () => {
    expect(xpParDefaut("quotidienne")).toBe(XP_QUETE_QUOTIDIENNE);
    expect(xpParDefaut("hebdomadaire")).toBe(XP_QUETE_HEBDO);
    expect(xpParDefaut("principale")).toBe(XP_QUETE_PRINCIPALE);
  });
});

describe("recompenseEffective", () => {
  it("applique le défaut XP de la catégorie quand xp est absent", () => {
    const r = recompenseEffective(mission({ categorie: "principale", recompense: { argent: 200 } }));
    expect(r).toEqual({ argent: 200, xp: XP_QUETE_PRINCIPALE, energie: 0 });
  });

  it("respecte un xp explicite, y compris 0", () => {
    expect(recompenseEffective(mission({ recompense: { argent: 30, xp: 300 } })).xp).toBe(300);
    expect(recompenseEffective(mission({ recompense: { argent: 30, xp: 0 } })).xp).toBe(0);
  });

  it("énergie absente → 0, explicite → conservée", () => {
    expect(recompenseEffective(mission()).energie).toBe(0);
    expect(recompenseEffective(mission({ recompense: { argent: 30, energie: 2 } })).energie).toBe(2);
  });
});

const LEDGER = { designation: "Mission · T", courrierId: "m1" };

describe("appliquerRecompense", () => {
  it("crédite l'argent au grand livre avec params xp/énergie", () => {
    const s = createMockGameState({ budget: 100 });
    const next = appliquerRecompense(s, { argent: 50, xp: 25, energie: 2 }, LEDGER, 0);
    expect(next.budget).toBe(150);
    const e = next.grandLivre.at(-1)!;
    expect(e.kind).toBe("mission_recompense");
    expect(e.recette).toBe(50);
    expect(e.params).toMatchObject({ courrierId: "m1", xp: 25, energie: 2 });
  });

  it("verse l'XP au brocanteur", () => {
    const s = createMockGameState();
    const next = appliquerRecompense(s, { argent: 0, xp: 40, energie: 0 }, LEDGER, 0);
    expect(next.brocanteur.xp).toBe(s.brocanteur.xp + 40);
  });

  it("énergie : settle d'abord, puis gain avec débordement (4 + 2 → 6)", () => {
    const s = createMockGameState({ energie: 4, energieDerniereMaj: 0 });
    const next = appliquerRecompense(s, { argent: 0, xp: 0, energie: 2 }, LEDGER, 0);
    expect(next.energie).toBe(6);
  });

  it("énergie bornée par ENERGIE_PLAFOND (9 + 5 → 10)", () => {
    const s = createMockGameState({ energie: 9, energieDerniereMaj: 0 });
    const next = appliquerRecompense(s, { argent: 0, xp: 0, energie: 5 }, LEDGER, 0);
    expect(next.energie).toBe(10);
  });

  it("gain d'énergie nul : la jauge settle mais ne bouge pas", () => {
    const s = createMockGameState({ energie: 3, energieDerniereMaj: 0 });
    const next = appliquerRecompense(s, { argent: 10, xp: 10, energie: 0 }, LEDGER, 0);
    expect(next.energie).toBe(3);
  });
});
