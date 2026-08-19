import { describe, expect, it } from "vitest";
import { JOUR_OUVERTURE_BAZAR, bazarEstOuvert } from "@/lib/bazar/ouverture";
import { dateForJour } from "@/lib/calendrier";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("ouverture du Bazar", () => {
  it("le jour d'ouverture est bien le 10 juillet 1924", () => {
    const d = dateForJour(JOUR_OUVERTURE_BAZAR);
    expect(d.getUTCFullYear()).toBe(1924);
    expect(d.getUTCMonth()).toBe(6); // juillet
    expect(d.getUTCDate()).toBe(10);
  });

  it("fermé la veille, ouvert le jour même et après", () => {
    expect(bazarEstOuvert(createMockGameState({ jourActuel: JOUR_OUVERTURE_BAZAR - 1 }))).toBe(false);
    expect(bazarEstOuvert(createMockGameState({ jourActuel: JOUR_OUVERTURE_BAZAR }))).toBe(true);
    expect(bazarEstOuvert(createMockGameState({ jourActuel: JOUR_OUVERTURE_BAZAR + 200 }))).toBe(true);
  });
});
