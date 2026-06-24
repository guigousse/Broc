import { describe, it, expect } from "vitest";
import { poserAncre, tempsConfianceCourant } from "./horloge";

describe("horloge monotone", () => {
  it("extrapole le temps de confiance via le delta monotone", () => {
    const ancre = poserAncre(1_700_000_000_000, 5_000);
    // 12 s de monotone écoulées → +12 000 ms de temps de confiance.
    expect(tempsConfianceCourant(ancre, 17_000)).toBe(1_700_000_012_000);
  });

  it("est insensible à l'heure système (ne dépend que de l'ancre + monotone)", () => {
    const ancre = poserAncre(1_700_000_000_000, 0);
    // Peu importe l'heure système : seul le monotone fait avancer le résultat.
    expect(tempsConfianceCourant(ancre, 60_000)).toBe(1_700_000_060_000);
  });
});
