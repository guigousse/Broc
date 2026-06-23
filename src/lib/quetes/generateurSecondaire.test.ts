import { describe, expect, it } from "vitest";
import { genererQueteSecondaire } from "./generateurSecondaire";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

// rng déterministe : 0 → tous les tirages "bas"
const rng0 = () => 0;

describe("genererQueteSecondaire", () => {
  it("génère une quête secondaire valide au départ (rng favorable)", () => {
    const c = genererQueteSecondaire(createMockGameState(), 5, rng0);
    expect(c).not.toBeNull();
    expect(c!.payload.type).toBe("mission");
    if (c!.payload.type !== "mission") return;
    expect(c!.payload.categorie).toBe("secondaire");
    expect(c!.payload.cibles.length).toBeGreaterThanOrEqual(1);
    expect(c!.payload.jourLimite! - 5).toBeGreaterThanOrEqual(14);
    expect(c!.payload.jourLimite! - 5).toBeLessThanOrEqual(21);
    expect(c!.payload.recompense.argent).toBeGreaterThan(0);
    expect(c!.lu).toBe(true);
  });

  it("renvoie null si le tirage probabiliste échoue (rng élevé)", () => {
    expect(genererQueteSecondaire(createMockGameState(), 5, () => 0.99)).toBeNull();
  });

  it("ne demande pas un objet déjà ciblé par une quête active", () => {
    const state = createMockGameState();
    const c1 = genererQueteSecondaire(state, 5, rng0);
    expect(c1).not.toBeNull();
    // injecte c1 comme active, regénère : la nouvelle ne doit pas répéter le même templateId
    const tid = c1!.payload.type === "mission" ? c1!.payload.cibles[0].templateId : "";
    const state2 = {
      ...state,
      courriers: [...state.courriers, c1!],
      missions: [...state.missions, { courrierId: c1!.id, statut: "active" as const }],
    };
    const c2 = genererQueteSecondaire(state2, 6, rng0);
    if (c2 && c2.payload.type === "mission") {
      expect(c2.payload.cibles.map((x) => x.templateId)).not.toContain(tid);
    }
  });
});
