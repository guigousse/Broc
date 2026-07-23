// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted : vi.mock est hissé en tête de fichier, la factory ne doit pas
// capturer une variable déclarée après coup.
const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

function simulerTauriIos() {
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  Object.defineProperty(window.navigator, "userAgent", {
    value: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)",
    configurable: true,
  });
}

async function chargerFrais() {
  vi.resetModules();
  return {
    adMob: await import("./adMobProvider"),
    provider: await import("./adProvider"),
  };
}

beforeEach(() => {
  invokeMock.mockReset();
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("adMobDisponible", () => {
  it("faux hors Tauri (web)", async () => {
    const { adMob } = await chargerFrais();
    expect(adMob.adMobDisponible()).toBe(false);
  });

  it("vrai sous Tauri iOS", async () => {
    simulerTauriIos();
    const { adMob } = await chargerFrais();
    expect(adMob.adMobDisponible()).toBe(true);
  });
});

describe("getAdProvider", () => {
  it("retombe sur le stub hors Tauri iOS", async () => {
    const { provider } = await chargerFrais();
    expect(provider.getAdProvider()).toBeInstanceOf(provider.StubAdProvider);
  });

  it("choisit AdMob sous Tauri iOS", async () => {
    simulerTauriIos();
    const { adMob, provider } = await chargerFrais();
    expect(provider.getAdProvider()).toBeInstanceOf(adMob.AdMobAdProvider);
  });
});

describe("AdMobAdProvider", () => {
  it("initialise une seule fois (idempotent) puis montre la pub", async () => {
    simulerTauriIos();
    invokeMock.mockResolvedValue({ rewarded: true });
    const { adMob } = await chargerFrais();
    const p = new adMob.AdMobAdProvider();
    await p.showRewardedAd();
    await p.showRewardedAd();
    const initCalls = invokeMock.mock.calls.filter(
      (c) => c[0] === "plugin:admob|initialize"
    );
    expect(initCalls).toHaveLength(1);
  });

  it("mappe rewarded=true", async () => {
    simulerTauriIos();
    invokeMock.mockResolvedValue({ rewarded: true });
    const { adMob } = await chargerFrais();
    await expect(new adMob.AdMobAdProvider().showRewardedAd()).resolves.toEqual({
      rewarded: true,
    });
  });

  it("mappe rewarded=false (pub fermée avant la fin) sans throw", async () => {
    simulerTauriIos();
    invokeMock.mockResolvedValue({ rewarded: false });
    const { adMob } = await chargerFrais();
    await expect(new adMob.AdMobAdProvider().showRewardedAd()).resolves.toEqual({
      rewarded: false,
    });
  });

  it("propage l'échec technique (invoke rejeté) en exception", async () => {
    simulerTauriIos();
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "plugin:admob|initialize"
        ? Promise.resolve()
        : Promise.reject(new Error("no-fill"))
    );
    const { adMob } = await chargerFrais();
    await expect(new adMob.AdMobAdProvider().showRewardedAd()).rejects.toThrow();
  });

  it("retente l'init au prochain appel si elle a échoué", async () => {
    simulerTauriIos();
    invokeMock.mockRejectedValueOnce(new Error("offline"));
    invokeMock.mockResolvedValue({ rewarded: true });
    const { adMob } = await chargerFrais();
    const p = new adMob.AdMobAdProvider();
    await expect(p.showRewardedAd()).rejects.toThrow();
    await expect(p.showRewardedAd()).resolves.toEqual({ rewarded: true });
  });
});
