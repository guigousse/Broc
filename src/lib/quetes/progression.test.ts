import { describe, expect, it } from "vitest";
import { niveauProgression, capSecondaires } from "./progression";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("progression", () => {
  it("au départ : tierMax 1, cap minimal 2", () => {
    const state = createMockGameState();
    const n = niveauProgression(state);
    expect(n.tierMax).toBe(1);
    expect(n.nbDebloquees).toBeGreaterThanOrEqual(1);
    expect(capSecondaires(state)).toBeGreaterThanOrEqual(2);
    expect(capSecondaires(state)).toBeLessThanOrEqual(6);
  });
});
