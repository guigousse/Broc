import { describe, expect, it } from "vitest";
import { tickQuetes } from "./tick";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("tickQuetes", () => {
  it("ajoute le chapitre 1 et crée sa résolution active", () => {
    const state = createMockGameState();
    const out = tickQuetes(state, 1);
    expect(out.courriers.some((c) => c.id === "principale_ch1")).toBe(true);
    expect(out.missions.some((m) => m.courrierId === "principale_ch1" && m.statut === "active")).toBe(true);
  });
});
