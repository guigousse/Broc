import { describe, it, expect } from "vitest";
import { genererLot } from "./periodiques";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

function rngSeq(vals: number[]): () => number {
  let i = 0;
  return () => vals[i++ % vals.length];
}

describe("genererLot", () => {
  it("quotidienne : missions de catégorie quotidienne, 1 cible chacune", () => {
    const state = createMockGameState();
    const lot = genererLot(state, "quotidienne", "2026-06-25", rngSeq([0.1, 0.5, 0.9]));
    expect(lot.length).toBeGreaterThan(0);
    expect(lot.length).toBeLessThanOrEqual(3);
    for (const c of lot) {
      expect(c.payload.type).toBe("mission");
      if (c.payload.type === "mission") {
        expect(c.payload.categorie).toBe("quotidienne");
        expect(c.payload.cibles).toHaveLength(1);
      }
      expect(c.id).toContain("2026-06-25");
    }
  });

  it("hebdomadaire : 2 à 3 cibles par commande", () => {
    const state = createMockGameState();
    const lot = genererLot(state, "hebdomadaire", "2026-W26", rngSeq([0.1, 0.5, 0.9, 0.3]));
    for (const c of lot) {
      if (c.payload.type === "mission") {
        expect(c.payload.cibles.length).toBeGreaterThanOrEqual(2);
        expect(c.payload.cibles.length).toBeLessThanOrEqual(3);
        expect(c.payload.categorie).toBe("hebdomadaire");
      }
    }
  });

  it("ids uniques dans le lot", () => {
    const state = createMockGameState();
    const lot = genererLot(state, "quotidienne", "2026-06-25", rngSeq([0.2, 0.7, 0.4]));
    const ids = lot.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
