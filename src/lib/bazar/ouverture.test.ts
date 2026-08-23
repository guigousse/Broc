import { describe, expect, it } from "vitest";
import {
  JOUR_OUVERTURE_BAZAR,
  bazarEstOuvert,
  joursAvantOuvertureBazar,
} from "@/lib/bazar/ouverture";
import { dateForJour } from "@/lib/calendrier";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("ouverture du Bazar", () => {
  it("le jour d'ouverture est bien le 25 juin 1924", () => {
    const d = dateForJour(JOUR_OUVERTURE_BAZAR);
    expect(d.getUTCFullYear()).toBe(1924);
    expect(d.getUTCMonth()).toBe(5); // juin
    expect(d.getUTCDate()).toBe(25);
  });

  it("fermé la veille, ouvert le jour même et après", () => {
    expect(bazarEstOuvert(createMockGameState({ jourActuel: JOUR_OUVERTURE_BAZAR - 1 }))).toBe(false);
    expect(bazarEstOuvert(createMockGameState({ jourActuel: JOUR_OUVERTURE_BAZAR }))).toBe(true);
    expect(bazarEstOuvert(createMockGameState({ jourActuel: JOUR_OUVERTURE_BAZAR + 200 }))).toBe(true);
  });

  it("compte les jours qui restent avant l'ouverture", () => {
    const jours = (jourActuel: number) =>
      joursAvantOuvertureBazar(createMockGameState({ jourActuel }));
    expect(jours(1)).toBe(JOUR_OUVERTURE_BAZAR - 1);
    expect(jours(JOUR_OUVERTURE_BAZAR - 1)).toBe(1);
  });

  it("ne rend jamais un compte négatif une fois le Bazar ouvert", () => {
    // Le gabarit « J-{n} » n'est plus affiché passé l'ouverture, mais un zéro
    // franc vaut mieux qu'un nombre négatif qui fuirait à la moindre régression.
    const jours = (jourActuel: number) =>
      joursAvantOuvertureBazar(createMockGameState({ jourActuel }));
    expect(jours(JOUR_OUVERTURE_BAZAR)).toBe(0);
    expect(jours(JOUR_OUVERTURE_BAZAR + 200)).toBe(0);
  });
});
