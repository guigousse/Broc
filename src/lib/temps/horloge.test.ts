import { describe, it, expect } from "vitest";
import { poserAncre, tempsConfianceCourant } from "./horloge";

const T0 = 1_700_000_000_000;

describe("horloge monotone", () => {
  it("extrapole le temps de confiance via le delta monotone", () => {
    const ancre = poserAncre(T0, 5_000, T0);
    // 12 s de monotone écoulées → +12 000 ms de temps de confiance.
    expect(tempsConfianceCourant(ancre, 17_000, T0 + 12_000)).toBe(
      T0 + 12_000,
    );
  });

  it("ne recule pas si l'horloge système recule (le monotone fait foi)", () => {
    const ancre = poserAncre(T0, 0, T0);
    // Horloge système reculée d'une heure en cours de session : sans effet.
    expect(tempsConfianceCourant(ancre, 60_000, T0 - 3_600_000)).toBe(
      T0 + 60_000,
    );
  });

  it("ne reste pas en retard quand le monotone se fige (veille iOS)", () => {
    const ancre = poserAncre(T0, 5_000, T0);
    // 45 min de veille profonde : `performance.now()` est resté figé alors que
    // le temps réel a bien avancé → le temps de confiance doit suivre le réel,
    // sinon l'énergie semble gelée au retour dans l'app.
    expect(tempsConfianceCourant(ancre, 5_000, T0 + 45 * 60_000)).toBe(
      T0 + 45 * 60_000,
    );
  });

  it("prend le plus avancé des deux deltas (veille partielle)", () => {
    const ancre = poserAncre(T0, 1_000, T0);
    // 10 min réelles dont 2 min de monotone (le reste en veille).
    expect(tempsConfianceCourant(ancre, 121_000, T0 + 600_000)).toBe(
      T0 + 600_000,
    );
  });
});
