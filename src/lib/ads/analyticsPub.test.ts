import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StubAdProvider, EMPLACEMENTS_PUB } from "./adProvider";
import {
  EVENEMENTS,
  StubAnalyticsProvider,
  reinitialiserAnalyticsPourTest,
} from "@/lib/analytics/analytics";
import { definirLecteurContexte } from "@/lib/analytics/contexte";

let stub: StubAnalyticsProvider;

beforeEach(() => {
  stub = new StubAnalyticsProvider();
  reinitialiserAnalyticsPourTest(stub);
  definirLecteurContexte(() => ({ jour: 5, niveau: 3 }));
});

afterEach(() => {
  reinitialiserAnalyticsPourTest();
  definirLecteurContexte(null);
});

describe("mesure des pubs récompensées", () => {
  it("émet pub_demandee puis pub_terminee, dans cet ordre, avec l'emplacement", async () => {
    await new StubAdProvider(0).showRewardedAd(EMPLACEMENTS_PUB.boiteMystere);
    expect(stub.appels.map((a) => a.nom)).toEqual([
      EVENEMENTS.pubDemandee,
      EVENEMENTS.pubTerminee,
    ]);
    expect(stub.appels[0].params.emplacement).toBe("boite-mystere");
    expect(stub.appels[1].params).toMatchObject({
      emplacement: "boite-mystere",
      rewarded: true,
    });
  });

  it("porte le contexte de jeu sur les deux événements", async () => {
    await new StubAdProvider(0).showRewardedAd(EMPLACEMENTS_PUB.energie);
    for (const appel of stub.appels) {
      expect(appel.params).toMatchObject({ jour: 5, jour_tranche: "1-7", niveau: 3 });
    }
  });
});
