// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";

const uaOrigine = window.navigator.userAgent;

function simulerTauri(ua: string) {
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

const UA_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36";
const UA_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)";

async function chargerFrais() {
  vi.resetModules();
  return await import("./iapProvider");
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  Object.defineProperty(window.navigator, "userAgent", {
    value: uaOrigine,
    configurable: true,
  });
  window.localStorage.clear();
});

describe("achatDisponible", () => {
  it("faux sous Tauri Android — Play Billing n'est pas encore branché", async () => {
    simulerTauri(UA_ANDROID);
    const { achatDisponible } = await chargerFrais();
    expect(achatDisponible()).toBe(false);
  });

  it("vrai sous Tauri iOS", async () => {
    simulerTauri(UA_IOS);
    const { achatDisponible } = await chargerFrais();
    expect(achatDisponible()).toBe(true);
  });

  it("vrai hors Tauri (le stub de dev reste disponible)", async () => {
    const { achatDisponible } = await chargerFrais();
    expect(achatDisponible()).toBe(true);
  });
});

describe("getIapProvider selon la plateforme", () => {
  it("sur Android, renvoie le provider indisponible", async () => {
    simulerTauri(UA_ANDROID);
    const { getIapProvider, IndisponibleIapProvider } = await chargerFrais();
    expect(getIapProvider()).toBeInstanceOf(IndisponibleIapProvider);
  });

  it("GARDE : sur Android, aucun achat n'aboutit jamais", async () => {
    simulerTauri(UA_ANDROID);
    const { getIapProvider } = await chargerFrais();
    await expect(getIapProvider().acheter()).rejects.toThrow();
    await expect(getIapProvider().verifierEntitlement()).resolves.toBe(false);
    await expect(getIapProvider().restaurer()).resolves.toBe(false);
  });
});
