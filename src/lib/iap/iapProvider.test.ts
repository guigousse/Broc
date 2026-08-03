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

  it("le stub simule un achat réussi", async () => {
    const stub = new StubIapProvider(0);
    await expect(stub.acheter()).resolves.toBe("achete");
  });

  it("le stub expose un prix d'affichage", async () => {
    const stub = new StubIapProvider(0);
    await expect(stub.obtenirPrix()).resolves.toBe("3,99 €");
  });

  it("verifierEntitlement / restaurer reflètent le drapeau local", async () => {
    const stub = new StubIapProvider(0);
    await expect(stub.verifierEntitlement()).resolves.toBe(false);
    definirEnergieInfinie(true);
    await expect(stub.verifierEntitlement()).resolves.toBe(true);
    await expect(stub.restaurer()).resolves.toBe(true);
  });
});
