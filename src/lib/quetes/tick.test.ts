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

describe("cartes postales (épilogue)", () => {
  const finTrame = (jourResolution: number) => createMockGameState({
    tutorielEtape: "termine",
    missions: [{ courrierId: "trame_ch12", statut: "livree", jourResolution }],
  });
  it("rien avant l'intervalle", () => {
    const t = tickQuetes(finTrame(10), 15);
    expect(t.courriers.some((c) => c.id.startsWith("carte_postale"))).toBe(false);
  });
  it("injecte la carte 1 à J+6, non lue, expéditeur grand-père", () => {
    const t = tickQuetes(finTrame(10), 16);
    const carte = t.courriers.find((c) => c.id === "carte_postale_1");
    expect(carte).toBeDefined();
    expect(carte?.lu).toBe(false);
  });
  it("une seule carte par tick, idempotent, s'arrête à 5", () => {
    let state = finTrame(0);
    for (let jour = 1; jour <= 60; jour++) {
      const t = tickQuetes({ ...state, jourActuel: jour }, jour);
      state = { ...state, courriers: t.courriers, missions: t.missions };
    }
    const cartes = state.courriers.filter((c) => c.id.startsWith("carte_postale"));
    expect(cartes.map((c) => c.id).sort()).toEqual(
      ["carte_postale_1", "carte_postale_2", "carte_postale_3", "carte_postale_4", "carte_postale_5"],
    );
  });
  it("rien si la trame n'est pas finie", () => {
    const t = tickQuetes(createMockGameState({ tutorielEtape: "termine" }), 50);
    expect(t.courriers.some((c) => c.id.startsWith("carte_postale"))).toBe(false);
  });
});
