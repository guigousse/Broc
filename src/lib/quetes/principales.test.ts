import { describe, expect, it } from "vitest";
import { debloquerQuetesPrincipales } from "./principales";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("debloquerQuetesPrincipales", () => {
  it("injecte le chapitre 1 (depart) si absent", () => {
    const out = debloquerQuetesPrincipales(createMockGameState(), 1);
    expect(out.length).toBe(1);
    expect(out[0].id).toBe("principale_ch1");
    expect(out[0].payload.type).toBe("mission");
  });

  it("n'injecte pas le chapitre 2 tant que le chapitre 1 n'est pas livré", () => {
    const state = createMockGameState();
    const ch1 = debloquerQuetesPrincipales(state, 1)[0];
    const avecCh1 = {
      ...state,
      courriers: [...state.courriers, ch1],
      missions: [...state.missions, { courrierId: "principale_ch1", statut: "active" as const }],
    };
    expect(debloquerQuetesPrincipales(avecCh1, 2)).toEqual([]);
  });

  it("n'injecte rien si le chapitre 1 est déjà présent et actif", () => {
    const state = createMockGameState();
    const ch1 = debloquerQuetesPrincipales(state, 1)[0];
    const avecCh1 = { ...state, courriers: [...state.courriers, ch1] };
    expect(debloquerQuetesPrincipales(avecCh1, 1)).toEqual([]);
  });
});
