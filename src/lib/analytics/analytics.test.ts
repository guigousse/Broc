import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

describe("garde : personne n'appelle logEvent en contournant le contexte", () => {
  it("aucun fichier de src/ n'appelle getAnalytics().logEvent hors de la lib analytics", () => {
    const fautifs: string[] = [];
    const parcourir = (dossier: string) => {
      for (const entree of readdirSync(dossier, { withFileTypes: true })) {
        const chemin = join(dossier, entree.name);
        if (entree.isDirectory()) {
          parcourir(chemin);
        } else if (/\.tsx?$/.test(entree.name) && !chemin.includes("lib/analytics")) {
          if (/getAnalytics\(\)\s*\.\s*logEvent/.test(readFileSync(chemin, "utf8"))) {
            fautifs.push(chemin);
          }
        }
      }
    };
    parcourir("src");
    expect(fautifs).toEqual([]);
  });
});
