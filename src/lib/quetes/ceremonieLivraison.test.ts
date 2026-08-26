import { describe, expect, it } from "vitest";
import {
  DECALAGE_VOL_MS, SORTIE_APRES_DERNIER_MS, VOL_MS, phasesLivraison,
} from "./ceremonieLivraison";

describe("phasesLivraison", () => {
  it("ordre XP → énergie → argent quand les trois gains sont présents", () => {
    const envols = phasesLivraison({ argent: 200, xp: 300, energie: 2, jetons: 0 })
      .filter((e) => e.etape.type === "envol")
      .map((e) => (e.etape.type === "envol" ? e.etape.jeton : ""));
    expect(envols).toEqual(["xp", "energie", "argent"]);
  });

  /**
   * Les Bazarcoins volent EN DERNIER (demande de l'auteur, 2026-08-26) : la
   * caisse porte deux monnaies, et les voir arriver l'une après l'autre dit
   * laquelle vient de grossir. Ensemble, elles se disputeraient le même coin
   * de l'écran.
   */
  it("ordre XP → énergie → argent → Bazarcoins quand tout est présent", () => {
    const envols = phasesLivraison({ argent: 200, xp: 300, energie: 2, jetons: 3 })
      .filter((e) => e.etape.type === "envol")
      .map((e) => (e.etape.type === "envol" ? e.etape.jeton : ""));
    expect(envols).toEqual(["xp", "energie", "argent", "bazar"]);
  });

  // Le cas courant d'une quête quotidienne : des jetons, et rien d'autre.
  it("des Bazarcoins seuls volent quand même", () => {
    const plan = phasesLivraison({ argent: 0, xp: 0, energie: 0, jetons: 1 });
    const envols = plan.filter((e) => e.etape.type === "envol");
    expect(envols).toHaveLength(1);
    expect(envols[0].etape).toEqual({ type: "envol", jeton: "bazar" });
    expect(envols[0].at).toBe(0);
  });

  it("omet les Bazarcoins à 0", () => {
    const plan = phasesLivraison({ argent: 30, xp: 25, energie: 0, jetons: 0 });
    expect(plan.some((e) => e.etape.type === "envol" && e.etape.jeton === "bazar")).toBe(false);
  });

  it("omet les jetons à 0 (pas d'énergie → deux vols)", () => {
    const plan = phasesLivraison({ argent: 30, xp: 25, energie: 0, jetons: 0 });
    expect(plan.filter((e) => e.etape.type === "envol").length).toBe(2);
    expect(plan.some((e) => e.etape.type === "envol" && e.etape.jeton === "energie")).toBe(false);
  });

  it("envols espacés de DECALAGE_VOL_MS, atterrissage à envol+VOL_MS, dates croissantes", () => {
    const plan = phasesLivraison({ argent: 10, xp: 25, energie: 1, jetons: 0 });
    const envolXp = plan.find((e) => e.etape.type === "envol" && e.etape.jeton === "xp")!;
    const envolEnergie = plan.find((e) => e.etape.type === "envol" && e.etape.jeton === "energie")!;
    const atterXp = plan.find((e) => e.etape.type === "atterrissage" && e.etape.jeton === "xp")!;
    expect(envolXp.at).toBe(0);
    expect(envolEnergie.at).toBe(DECALAGE_VOL_MS);
    expect(atterXp.at).toBe(VOL_MS);
    for (let i = 1; i < plan.length; i++) expect(plan[i].at).toBeGreaterThanOrEqual(plan[i - 1].at);
  });

  it("sortie après le dernier atterrissage", () => {
    const plan = phasesLivraison({ argent: 10, xp: 25, energie: 0, jetons: 0 });
    const sortie = plan.at(-1)!;
    expect(sortie.etape.type).toBe("sortie");
    expect(sortie.at).toBe(DECALAGE_VOL_MS + VOL_MS + SORTIE_APRES_DERNIER_MS);
  });

  it("aucun gain : frise réduite à la sortie immédiate", () => {
    const plan = phasesLivraison({ argent: 0, xp: 0, energie: 0, jetons: 0 });
    expect(plan).toEqual([{ at: 0, etape: { type: "sortie" } }]);
  });
});
