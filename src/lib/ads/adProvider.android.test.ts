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
  return {
    provider: await import("./adProvider"),
    adMob: await import("./adMobProvider"),
  };
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  Object.defineProperty(window.navigator, "userAgent", {
    value: uaOrigine,
    configurable: true,
  });
});

/**
 * Depuis le sous-projet B, Android a sa régie (plugin Kotlin) : les gardes qui
 * privaient l'UI de pub sur Android disparaissent. `pubDisponible()` reste la
 * garde que l'UI consulte — elle vaut vrai partout aujourd'hui.
 */
describe("pubDisponible", () => {
  it("vrai sous Tauri Android — le plugin Kotlin est branché", async () => {
    simulerTauri(UA_ANDROID);
    const { provider } = await chargerFrais();
    expect(provider.pubDisponible()).toBe(true);
  });

  it("vrai sous Tauri iOS", async () => {
    simulerTauri(UA_IOS);
    const { provider } = await chargerFrais();
    expect(provider.pubDisponible()).toBe(true);
  });

  it("vrai hors Tauri (le stub de dev reste disponible)", async () => {
    const { provider } = await chargerFrais();
    expect(provider.pubDisponible()).toBe(true);
  });
});

describe("getAdProvider selon la plateforme", () => {
  it("sur Android, renvoie le provider AdMob natif", async () => {
    simulerTauri(UA_ANDROID);
    const { provider, adMob } = await chargerFrais();
    expect(provider.getAdProvider()).toBeInstanceOf(adMob.AdMobAdProvider);
  });

  it("sur iOS, renvoie le provider AdMob natif", async () => {
    simulerTauri(UA_IOS);
    const { provider, adMob } = await chargerFrais();
    expect(provider.getAdProvider()).toBeInstanceOf(adMob.AdMobAdProvider);
  });

  it("hors Tauri, renvoie le stub", async () => {
    const { provider } = await chargerFrais();
    expect(provider.getAdProvider()).toBeInstanceOf(provider.StubAdProvider);
  });

  it("GARDE : le provider « indisponible » n'existe plus", async () => {
    const { provider } = await chargerFrais();
    expect("IndisponibleAdProvider" in provider).toBe(false);
  });
});
