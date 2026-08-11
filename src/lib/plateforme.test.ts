// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { plateformeNative, tauriIosDisponible } from "./plateforme";

const uaOrigine = window.navigator.userAgent;

function poserUa(valeur: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: valeur,
    configurable: true,
  });
}

function poserTactile(n: number) {
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    value: n,
    configurable: true,
  });
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  poserUa(uaOrigine);
  poserTactile(0);
});

function simulerTauri(ua: string) {
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  poserUa(ua);
}

describe("plateformeNative", () => {
  it("null hors runtime Tauri (web, dev desktop, tests)", () => {
    poserUa("Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)");
    expect(plateformeNative()).toBe(null);
  });

  it("« ios » sous Tauri iPhone", () => {
    simulerTauri("Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)");
    expect(plateformeNative()).toBe("ios");
  });

  it("« ios » sous Tauri iPadOS 13+ (UA « Macintosh » + tactile)", () => {
    simulerTauri("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15");
    poserTactile(5);
    expect(plateformeNative()).toBe("ios");
  });

  it("null sous Tauri sur un vrai Mac (UA « Macintosh » sans tactile)", () => {
    simulerTauri("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15");
    poserTactile(0);
    expect(plateformeNative()).toBe(null);
  });

  it("« android » sous Tauri Android", () => {
    simulerTauri(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    );
    expect(plateformeNative()).toBe("android");
  });
});

describe("tauriIosDisponible", () => {
  it("vrai sous Tauri iOS", () => {
    simulerTauri("Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)");
    expect(tauriIosDisponible()).toBe(true);
  });

  it("faux sous Tauri Android — garde contre le retour des stubs sur Android", () => {
    simulerTauri("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36");
    expect(tauriIosDisponible()).toBe(false);
  });
});
