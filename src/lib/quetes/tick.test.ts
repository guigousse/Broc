import { describe, expect, it } from "vitest";
import { tickQuetes } from "./tick";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("tickQuetes", () => {
  it("ajoute le chapitre 1 et crée sa résolution active", () => {
    const state = createMockGameState();
    const out = tickQuetes(state, 1);
    expect(out.courriers.some((c) => c.id === "trame_ch1")).toBe(true);
    expect(out.missions.some((m) => m.courrierId === "trame_ch1" && m.statut === "active")).toBe(true);
  });

  it("ne débloque rien tant que le tutoriel guidé n'est pas terminé (arc différé à la conclusion)", () => {
    const state = createMockGameState({
      tutorielEtape: "premier-achat",
      courriers: [],
      missions: [],
    });
    const out = tickQuetes(state, 1);
    expect(out.courriers).toEqual(state.courriers);
    expect(out.missions).toEqual(state.missions);
    expect(out.courriers.some((c) => c.id === "trame_ch1")).toBe(false);
  });
});
