// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { StubIapProvider, getIapProvider } from "./iapProvider";
import { definirEnergieInfinie } from "./energieInfinie";

afterEach(() => {
  window.localStorage.clear();
});

describe("iapProvider — stub et singleton", () => {
  it("hors Tauri iOS, getIapProvider retourne le stub (et toujours le même)", () => {
    const p = getIapProvider();
    expect(p).toBeInstanceOf(StubIapProvider);
    expect(getIapProvider()).toBe(p);
  });

  it("en dev (stub actif), le stub simule un achat réussi et se dit disponible", async () => {
    const stub = new StubIapProvider(0, true);
    expect(stub.disponible()).toBe(true);
    await expect(stub.acheter()).resolves.toBe("achete");
  });

  it("en prod (stub inactif), le stub ne renvoie JAMAIS « achete » et se dit indisponible", async () => {
    const stub = new StubIapProvider(0, false);
    expect(stub.disponible()).toBe(false);
    await expect(stub.acheter()).resolves.toBe("indisponible");
    await expect(stub.restaurer()).resolves.toBe(false);
  });

  it("par défaut, l'activation du stub suit OUTILS_DEV (faux sous vitest)", async () => {
    const stub = new StubIapProvider(0);
    expect(stub.disponible()).toBe(false);
    await expect(stub.acheter()).resolves.not.toBe("achete");
  });

  it("le stub expose un prix d'affichage", async () => {
    const stub = new StubIapProvider(0, true);
    await expect(stub.obtenirPrix()).resolves.toBe("3,99 €");
  });

  it("verifierEntitlement / restaurer reflètent le drapeau local (stub actif)", async () => {
    const stub = new StubIapProvider(0, true);
    await expect(stub.verifierEntitlement()).resolves.toBe(false);
    definirEnergieInfinie(true);
    await expect(stub.verifierEntitlement()).resolves.toBe(true);
    await expect(stub.restaurer()).resolves.toBe(true);
  });
});
