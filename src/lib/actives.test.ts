import { describe, it, expect } from "vitest";
import { QUOTA_ACTIVES, NIVEAU_ACTIVES, activeDebloquee, usagesRestants, consommerActive } from "./actives";

describe("infra des actives", () => {
  it("quotas et niveaux du design", () => {
    expect(QUOTA_ACTIVES).toEqual({ flair: 1, lotGarni: 1, fouille: 3, boniment: 1, tchatche: 1, criee: 1, diplomate: 1 });
    expect(NIVEAU_ACTIVES).toEqual({ flair: 5, lotGarni: 7, fouille: 9, boniment: 13, tchatche: 15, criee: 17 });
  });

  it("déblocage par niveau (et Diplomate par compétence)", () => {
    const st = (niveau: number, comps: string[] = []) => ({ brocanteur: { xp: 0, niveau, pointsDisponibles: 0 }, competencesDebloquees: comps });
    expect(activeDebloquee(st(4), "flair")).toBe(false);
    expect(activeDebloquee(st(5), "flair")).toBe(true);
    expect(activeDebloquee(st(30), "diplomate")).toBe(false);
    expect(activeDebloquee(st(0, ["general.negociation.1", "general.negociation.2", "general.negociation.3"]), "diplomate")).toBe(true);
  });

  it("quota journalier : consommation, épuisement, reset au jour suivant", () => {
    let a = consommerActive(undefined, "fouille", 3)!;
    expect(usagesRestants(a, "fouille", 3)).toBe(2);
    a = consommerActive(consommerActive(a, "fouille", 3)!, "fouille", 3)!;
    expect(usagesRestants(a, "fouille", 3)).toBe(0);
    expect(consommerActive(a, "fouille", 3)).toBeNull();      // épuisé
    expect(usagesRestants(a, "fouille", 4)).toBe(3);          // nouveau jour
    expect(usagesRestants(a, "flair", 3)).toBe(1);            // indépendance des clés
  });
});
