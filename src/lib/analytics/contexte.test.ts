import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  definirLecteurContexte,
  contexteCourant,
  trancheJour,
  logEvenement,
} from "./contexte";
import {
  EVENEMENTS,
  StubAnalyticsProvider,
  reinitialiserAnalyticsPourTest,
} from "./analytics";

let stub: StubAnalyticsProvider;

beforeEach(() => {
  stub = new StubAnalyticsProvider();
  reinitialiserAnalyticsPourTest(stub);
});

afterEach(() => {
  definirLecteurContexte(null);
  reinitialiserAnalyticsPourTest();
});

describe("trancheJour", () => {
  it("range le jour dans la bonne tranche, bornes comprises", () => {
    expect(trancheJour(1)).toBe("1-7");
    expect(trancheJour(7)).toBe("1-7");
    expect(trancheJour(8)).toBe("8-14");
    expect(trancheJour(14)).toBe("8-14");
    expect(trancheJour(15)).toBe("15-30");
    expect(trancheJour(30)).toBe("15-30");
    expect(trancheJour(31)).toBe("31-60");
    expect(trancheJour(60)).toBe("31-60");
    expect(trancheJour(61)).toBe("61+");
    expect(trancheJour(400)).toBe("61+");
  });
});

describe("contexteCourant", () => {
  it("est vide sans lecteur enregistré", () => {
    expect(contexteCourant()).toEqual({});
  });

  it("est vide quand le lecteur rend null (hors partie)", () => {
    definirLecteurContexte(() => null);
    expect(contexteCourant()).toEqual({});
  });

  it("rend jour, jour_tranche et niveau quand une partie est en cours", () => {
    definirLecteurContexte(() => ({ jour: 12, niveau: 5 }));
    expect(contexteCourant()).toEqual({ jour: 12, jour_tranche: "8-14", niveau: 5 });
  });

  it("survit à un lecteur qui lève", () => {
    definirLecteurContexte(() => {
      throw new Error("état pas prêt");
    });
    expect(contexteCourant()).toEqual({});
  });
});

describe("logEvenement", () => {
  it("injecte le contexte dans TOUT événement", () => {
    definirLecteurContexte(() => ({ jour: 3, niveau: 2 }));
    logEvenement(EVENEMENTS.tutoTermine);
    logEvenement(EVENEMENTS.pubDemandee, { emplacement: "energie" });
    expect(stub.appels).toEqual([
      { nom: "tuto_termine", params: { jour: 3, jour_tranche: "1-7", niveau: 2 } },
      {
        nom: "pub_demandee",
        params: { emplacement: "energie", jour: 3, jour_tranche: "1-7", niveau: 2 },
      },
    ]);
  });

  it("n'ajoute rien hors partie", () => {
    definirLecteurContexte(() => null);
    logEvenement(EVENEMENTS.ecranVu, { screen_name: "menu" });
    expect(stub.appels).toEqual([{ nom: "screen_view", params: { screen_name: "menu" } }]);
  });

  it("les paramètres explicites l'emportent sur le contexte", () => {
    definirLecteurContexte(() => ({ jour: 3, niveau: 2 }));
    logEvenement(EVENEMENTS.jourAtteint, { jour: 9 });
    expect(stub.appels[0].params.jour).toBe(9);
  });

  it("n'explose jamais, même si le provider lève", () => {
    reinitialiserAnalyticsPourTest({
      logEvent() {
        throw new Error("natif cassé");
      },
      setUserProperty() {},
    });
    expect(() => logEvenement(EVENEMENTS.tutoTermine)).not.toThrow();
  });
});
