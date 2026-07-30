import { describe, expect, it } from "vitest";
import { recompenseEffective, xpParDefaut } from "./recompenses";
import { XP_QUETE_HEBDO, XP_QUETE_PRINCIPALE, XP_QUETE_QUOTIDIENNE } from "@/lib/xp";
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
