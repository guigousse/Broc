import { describe, it, expect, beforeEach } from "vitest";
import {
  EVENEMENTS,
  PROPRIETES,
  StubAnalyticsProvider,
  getAnalytics,
  reinitialiserAnalyticsPourTest,
} from "./analytics";

describe("EVENEMENTS", () => {
  it("chaque événement a un nom distinct", () => {
    const noms = Object.values(EVENEMENTS);
    expect(new Set(noms).size).toBe(noms.length);
  });

  it("les noms respectent la convention Firebase (snake_case, sans accent, ≤ 40 car.)", () => {
    for (const nom of Object.values(EVENEMENTS)) {
      expect(nom).toMatch(/^[a-z][a-z0-9_]{0,39}$/);
    }
  });

  it("les propriétés utilisateur respectent la même convention (≤ 24 car.)", () => {
    for (const nom of Object.values(PROPRIETES)) {
      expect(nom).toMatch(/^[a-z][a-z0-9_]{0,23}$/);
    }
  });
});

describe("StubAnalyticsProvider", () => {
  it("enregistre les événements reçus", () => {
    const stub = new StubAnalyticsProvider();
    stub.logEvent(EVENEMENTS.tutoTermine);
    stub.logEvent(EVENEMENTS.niveauAtteint, { niveau: 4 });
    expect(stub.appels).toEqual([
      { nom: "tuto_termine", params: {} },
      { nom: "niveau_atteint", params: { niveau: 4 } },
    ]);
  });

  it("viderAppels remet le journal à zéro", () => {
    const stub = new StubAnalyticsProvider();
    stub.logEvent(EVENEMENTS.tutoTermine);
    stub.viderAppels();
    expect(stub.appels).toEqual([]);
  });
});

describe("getAnalytics", () => {
  beforeEach(() => reinitialiserAnalyticsPourTest());

  it("rend le stub hors runtime Tauri", () => {
    expect(getAnalytics()).toBeInstanceOf(StubAnalyticsProvider);
  });

  it("rend un singleton stable", () => {
    expect(getAnalytics()).toBe(getAnalytics());
  });
});
