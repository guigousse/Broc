// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

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
  return await import("./adProvider");
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  Object.defineProperty(window.navigator, "userAgent", {
    value: uaOrigine,
    configurable: true,
  });
});

describe("pubDisponible", () => {
  it("faux sous Tauri Android — aucune régie n'y est branchée", async () => {
    simulerTauri(UA_ANDROID);
    const { pubDisponible } = await chargerFrais();
    expect(pubDisponible()).toBe(false);
  });

  it("vrai sous Tauri iOS", async () => {
    simulerTauri(UA_IOS);
    const { pubDisponible } = await chargerFrais();
    expect(pubDisponible()).toBe(true);
  });

  it("vrai hors Tauri (le stub de dev reste disponible)", async () => {
    const { pubDisponible } = await chargerFrais();
    expect(pubDisponible()).toBe(true);
  });
});

describe("getAdProvider selon la plateforme", () => {
  it("sur Android, renvoie le provider indisponible", async () => {
    simulerTauri(UA_ANDROID);
    const { getAdProvider, IndisponibleAdProvider } = await chargerFrais();
    expect(getAdProvider()).toBeInstanceOf(IndisponibleAdProvider);
  });

  it("hors Tauri, renvoie le stub", async () => {
    const { getAdProvider, StubAdProvider } = await chargerFrais();
    expect(getAdProvider()).toBeInstanceOf(StubAdProvider);
  });

  it("GARDE : sur Android, aucune récompense n'est jamais accordée", async () => {
    simulerTauri(UA_ANDROID);
    const { getAdProvider, EMPLACEMENTS_PUB } = await chargerFrais();
    await expect(
      getAdProvider().showRewardedAd(EMPLACEMENTS_PUB.energie),
    ).rejects.toThrow();
  });
});
