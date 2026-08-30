import { describe, expect, it } from "vitest";
import { settleBazar } from "@/lib/bazar/settleBazar";
import { NB_LOTS_PIECES } from "@/lib/bazar/etal";
import { JOUR_OUVERTURE_BAZAR } from "@/lib/bazar/ouverture";
import { cleSemaineLocale } from "@/lib/quetes/periode";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

const OUVERT = { jourActuel: JOUR_OUVERTURE_BAZAR };
const LUNDI = new Date(2026, 7, 17, 12, 0, 0).getTime();
const MARDI = new Date(2026, 7, 18, 12, 0, 0).getTime();
const LUNDI_SUIVANT = new Date(2026, 7, 24, 12, 0, 0).getTime();

describe("settleBazar", () => {
  it("ne compose rien tant que le Bazar n'a pas ouvert", () => {
    const state = createMockGameState({ jourActuel: JOUR_OUVERTURE_BAZAR - 1 });
    expect(settleBazar(state, LUNDI).bazar).toBeUndefined();
  });

  it("compose un étal au premier passage après l'ouverture", () => {
    const next = settleBazar(createMockGameState(OUVERT), LUNDI);
    expect(next.bazar?.cleSemaine).toBe(cleSemaineLocale(LUNDI));
    expect(next.bazar?.lotsPieces).toHaveLength(NB_LOTS_PIECES);
  });

  it("ne rejoue rien dans la même semaine — même référence d'objet", () => {
    const lundi = settleBazar(createMockGameState(OUVERT), LUNDI);
    const mardi = settleBazar(lundi, MARDI);
    expect(mardi).toBe(lundi);
  });

  it("renouvelle l'étal au passage à la semaine suivante", () => {
    const semaine1 = settleBazar(createMockGameState(OUVERT), LUNDI);
    const semaine2 = settleBazar(semaine1, LUNDI_SUIVANT);
    expect(semaine2.bazar?.cleSemaine).toBe(cleSemaineLocale(LUNDI_SUIVANT));
    expect(semaine2.bazar?.cleSemaine).not.toBe(semaine1.bazar?.cleSemaine);
  });

  it("l'étagère vidée par les achats revient garnie à la rotation", () => {
    const semaine1 = settleBazar(createMockGameState(OUVERT), LUNDI);
    const vide = {
      ...semaine1,
      bazar: { ...semaine1.bazar!, articles: [null, null, null] },
    };
    const semaine2 = settleBazar(vide, LUNDI_SUIVANT);
    expect(semaine2.bazar?.articles.every((a) => a !== null)).toBe(true);
  });
});
