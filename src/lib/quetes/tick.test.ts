import { describe, expect, it } from "vitest";
import { tickQuetes } from "./tick";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("tickQuetes", () => {
  // Depuis SP2 : les chapitres de la trame sont délivrés en dialogue
  // (accepterChapitre), plus au tick — cf. src/lib/quetes/principales.ts.
  it("passthrough : renvoie courriers/missions inchangés (tutoriel terminé)", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    const out = tickQuetes(state, 1);
    expect(out.courriers).toBe(state.courriers);
    expect(out.missions).toBe(state.missions);
  });

  it("passthrough : renvoie courriers/missions inchangés (tutoriel en cours)", () => {
    const state = createMockGameState({
      tutorielEtape: "premier-achat",
      courriers: [],
      missions: [],
    });
    const out = tickQuetes(state, 1);
    expect(out.courriers).toBe(state.courriers);
    expect(out.missions).toBe(state.missions);
  });
});
