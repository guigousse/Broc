import { describe, expect, it } from "vitest";
import {
  DECALAGE_VOL_MS, SORTIE_APRES_DERNIER_MS, VOL_MS, phasesLivraison,
} from "./ceremonieLivraison";

describe("phasesLivraison", () => {
  it("ordre XP → énergie → argent quand les trois gains sont présents", () => {
    const envols = phasesLivraison({ argent: 200, xp: 300, energie: 2 })
      .filter((e) => e.etape.type === "envol")
      .map((e) => (e.etape.type === "envol" ? e.etape.jeton : ""));
    expect(envols).toEqual(["xp", "energie", "argent"]);
  });

  it("omet les jetons à 0 (pas d'énergie → deux vols)", () => {
    const plan = phasesLivraison({ argent: 30, xp: 25, energie: 0 });
    expect(plan.filter((e) => e.etape.type === "envol").length).toBe(2);
    expect(plan.some((e) => e.etape.type === "envol" && e.etape.jeton === "energie")).toBe(false);
  });

  it("envols espacés de DECALAGE_VOL_MS, atterrissage à envol+VOL_MS, dates croissantes", () => {
    const plan = phasesLivraison({ argent: 10, xp: 25, energie: 1 });
    const envolXp = plan.find((e) => e.etape.type === "envol" && e.etape.jeton === "xp")!;
    const envolEnergie = plan.find((e) => e.etape.type === "envol" && e.etape.jeton === "energie")!;
    const atterXp = plan.find((e) => e.etape.type === "atterrissage" && e.etape.jeton === "xp")!;
    expect(envolXp.at).toBe(0);
    expect(envolEnergie.at).toBe(DECALAGE_VOL_MS);
    expect(atterXp.at).toBe(VOL_MS);
    for (let i = 1; i < plan.length; i++) expect(plan[i].at).toBeGreaterThanOrEqual(plan[i - 1].at);
  });

  it("sortie après le dernier atterrissage", () => {
    const plan = phasesLivraison({ argent: 10, xp: 25, energie: 0 });
    const sortie = plan.at(-1)!;
    expect(sortie.etape.type).toBe("sortie");
    expect(sortie.at).toBe(DECALAGE_VOL_MS + VOL_MS + SORTIE_APRES_DERNIER_MS);
  });

  it("aucun gain : frise réduite à la sortie immédiate", () => {
    const plan = phasesLivraison({ argent: 0, xp: 0, energie: 0 });
    expect(plan).toEqual([{ at: 0, etape: { type: "sortie" } }]);
  });
});
