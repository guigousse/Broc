import { describe, it, expect } from "vitest";
import { settleQuetesPeriodiques } from "./settlePeriodiques";
import { cleJourLocal, cleSemaineLocale } from "./periode";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

const now = Date.UTC(2026, 5, 25, 12, 0, 0);

describe("settleQuetesPeriodiques", () => {
  it("génère les lots quand les clés sont vides (nouvelle partie)", () => {
    const state = createMockGameState();
    const out = settleQuetesPeriodiques(state, now);
    expect(out.quetesPeriodiques.quotidien.cle).toBe(cleJourLocal(now));
    expect(out.quetesPeriodiques.hebdo.cle).toBe(cleSemaineLocale(now));
    expect(out.quetesPeriodiques.quotidien.courrierIds.length).toBeGreaterThan(0);
    for (const id of out.quetesPeriodiques.quotidien.courrierIds) {
      const c = out.courriers.find((x) => x.id === id);
      expect(c?.payload.type).toBe("mission");
      expect(out.missions.find((m) => m.courrierId === id)?.statut).toBe("active");
    }
  });

  it("est idempotent si les clés n'ont pas changé", () => {
    const state = settleQuetesPeriodiques(createMockGameState(), now);
    const again = settleQuetesPeriodiques(state, now);
    expect(again).toBe(state); // référence inchangée
  });

  it("régénère le lot quotidien quand le jour change (et supprime l'ancien)", () => {
    const j1 = settleQuetesPeriodiques(createMockGameState(), now);
    const anciensIds = j1.quetesPeriodiques.quotidien.courrierIds;
    const j2 = settleQuetesPeriodiques(j1, now + 24 * 60 * 60 * 1000);
    expect(j2.quetesPeriodiques.quotidien.cle).not.toBe(j1.quetesPeriodiques.quotidien.cle);
    for (const id of anciensIds) {
      expect(j2.courriers.find((c) => c.id === id)).toBeUndefined();
      expect(j2.missions.find((m) => m.courrierId === id)).toBeUndefined();
    }
  });

  it("ne touche pas aux missions principales", () => {
    const principal = {
      id: "princ_1",
      type: "mission" as const,
      jourRecu: 1,
      lu: true,
      payload: {
        type: "mission" as const,
        categorie: "principale" as const,
        expediteurId: "grand-pere",
        titre: "t",
        corps: [],
        cibles: [],
        recompense: { argent: 0 },
      },
    };
    const state = createMockGameState({
      courriers: [principal],
      missions: [{ courrierId: "princ_1", statut: "active" }],
    });
    const out = settleQuetesPeriodiques(state, now);
    expect(out.courriers.find((c) => c.id === "princ_1")).toBeDefined();
    expect(out.missions.find((m) => m.courrierId === "princ_1")).toBeDefined();
  });
});
