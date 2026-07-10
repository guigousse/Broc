import { describe, it, expect } from "vitest";
import {
  NIVEAU_ACTIVES,
  NIVEAU_USAGE_2,
  NIVEAU_USAGE_3,
  quotaActives,
  activeDebloquee,
  usagesRestants,
  consommerActive,
} from "./actives";

describe("infra des atouts (échelle 100 niveaux)", () => {
  it("déblocages tous les 5 niveaux (N5→30), 2ᵉ usage N35→60, 3ᵉ N65→90", () => {
    expect(NIVEAU_ACTIVES).toEqual({ flair: 5, lotGarni: 10, fouille: 15, boniment: 20, tchatche: 25, criee: 30 });
    expect(NIVEAU_USAGE_2).toEqual({ flair: 35, lotGarni: 40, fouille: 45, boniment: 50, tchatche: 55, criee: 60 });
    expect(NIVEAU_USAGE_3).toEqual({ flair: 65, lotGarni: 70, fouille: 75, boniment: 80, tchatche: 85, criee: 90 });
  });

  it("quota par niveau : 1 de base, 2 puis 3 via le leveling (Diplomate fixe à 1)", () => {
    expect(quotaActives("flair", 5)).toBe(1);
    expect(quotaActives("flair", 34)).toBe(1);
    expect(quotaActives("flair", 35)).toBe(2);
    expect(quotaActives("flair", 65)).toBe(3);
    expect(quotaActives("fouille", 15)).toBe(1); // ex-3 de base : uniformisé
    expect(quotaActives("criee", 90)).toBe(3);
    expect(quotaActives("diplomate", 100)).toBe(1);
  });

  it("déblocage par niveau (et Diplomate par compétence)", () => {
    const st = (niveau: number, comps: string[] = []) => ({ brocanteur: { xp: 0, niveau, pointsDisponibles: 0 }, competencesDebloquees: comps });
    expect(activeDebloquee(st(4), "flair")).toBe(false);
    expect(activeDebloquee(st(5), "flair")).toBe(true);
    expect(activeDebloquee(st(29), "criee")).toBe(false);
    expect(activeDebloquee(st(30), "criee")).toBe(true);
    expect(activeDebloquee(st(30), "diplomate")).toBe(false);
    expect(activeDebloquee(st(0, ["general.negociation.1", "general.negociation.2", "general.negociation.3"]), "diplomate")).toBe(true);
  });

  it("quota journalier : consommation, épuisement, reset au jour suivant", () => {
    // Niveau 45 : la Fouille a son 2ᵉ usage (45 ≥ NIVEAU_USAGE_2.fouille).
    let a = consommerActive(undefined, "fouille", 3, 45)!;
    expect(usagesRestants(a, "fouille", 3, 45)).toBe(1);
    a = consommerActive(a, "fouille", 3, 45)!;
    expect(usagesRestants(a, "fouille", 3, 45)).toBe(0);
    expect(consommerActive(a, "fouille", 3, 45)).toBeNull(); // épuisé
    expect(usagesRestants(a, "fouille", 4, 45)).toBe(2); // nouveau jour
    expect(usagesRestants(a, "flair", 3, 45)).toBe(2); // indépendance des clés
  });
});
