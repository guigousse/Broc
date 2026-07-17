import { describe, expect, it } from "vitest";
import { BROCANTES } from "./brocantes";
import type { ConditionDeblocage } from "@/types/game";

function atomes(c: ConditionDeblocage): ConditionDeblocage[] {
  return c.type === "ET" ? c.conditions.flatMap(atomes) : [c];
}

describe("gates des brocantes (SP2)", () => {
  it("aucune brocante n'est gatée par le niveau", () => {
    for (const b of BROCANTES) {
      expect(atomes(b.conditionDeblocage).some((a) => a.type === "niveau")).toBe(false);
    }
  });
  it("chaque brocante de tier N>1 exige le chapitre d'invitation du tier", () => {
    const ordreParTier = { 2: 4, 3: 8, 4: 10 } as const;
    for (const b of BROCANTES.filter((b) => b.tier > 1)) {
      const chap = atomes(b.conditionDeblocage).find((a) => a.type === "chapitrePrincipal");
      expect(chap, b.id).toBeDefined();
      expect((chap as { ordre: number }).ordre).toBe(ordreParTier[b.tier as 2 | 3 | 4]);
    }
  });
});
