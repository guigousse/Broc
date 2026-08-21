// @vitest-environment jsdom
/**
 * Pont haptique : sous runtime Tauri il tape le plugin natif une fois par
 * appel ; hors Tauri (navigateur, `next dev`, tests) il ne fait rien ; et une
 * panne du plugin ne doit jamais remonter à l'appelant — une vibration ratée
 * n'a pas le droit de casser l'apparition d'un acheteur.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const impactFeedback = vi.fn(async (_style?: string) => {});

vi.mock("@tauri-apps/plugin-haptics", () => ({
  impactFeedback,
}));

const { vibrerApparition, vibrerExplosion } = await import("./index");
const { setVibrationsActives } = await import("./prefs");

beforeEach(() => {
  impactFeedback.mockClear();
  impactFeedback.mockImplementation(async () => {});
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  window.localStorage.clear();
});

describe("vibrerApparition()", () => {
  it("ne touche pas au plugin hors runtime Tauri", async () => {
    await vibrerApparition();
    expect(impactFeedback).not.toHaveBeenCalled();
  });

  it("déclenche une secousse légère sous runtime Tauri", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    await vibrerApparition();
    expect(impactFeedback).toHaveBeenCalledTimes(1);
    expect(impactFeedback).toHaveBeenCalledWith("light");
  });

  it("avale l'échec du plugin au lieu de le propager", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    impactFeedback.mockRejectedValueOnce(new Error("pas de moteur haptique"));
    await expect(vibrerApparition()).resolves.toBeUndefined();
  });

  it("SIGNALE l'échec en console au lieu de l'effacer", async () => {
    // Un refus de l'ACL (« haptics.impact_feedback not allowed ») ressemblait
    // en tout point à un succès : rien ne vibrait, rien ne se plaignait. La
    // panne doit rester visible dans la console de l'appareil.
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    impactFeedback.mockRejectedValueOnce(new Error("not allowed"));
    await vibrerApparition();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0])).toContain("not allowed");
    warn.mockRestore();
  });
});

describe("vibrerApparition() — préférence joueur", () => {
  it("ne vibre pas quand le joueur a coupé les vibrations", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    setVibrationsActives(false);
    await vibrerApparition();
    expect(impactFeedback).not.toHaveBeenCalled();
  });

  it("revibre dès que le joueur les rallume", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    setVibrationsActives(false);
    setVibrationsActives(true);
    await vibrerApparition();
    expect(impactFeedback).toHaveBeenCalledTimes(1);
  });
});

describe("vibrerExplosion()", () => {
  it("frappe fort pour le bouquet principal", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    await vibrerExplosion(1);
    expect(impactFeedback).toHaveBeenCalledWith("heavy");
  });

  it("frappe plus doucement pour les bouquets satellites", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    await vibrerExplosion(0.72);
    expect(impactFeedback).toHaveBeenCalledWith("medium");
  });

  it("reste plus forte que la secousse d'un acheteur", async () => {
    // Le sens de la demande : le feu d'artifice doit se distinguer nettement
    // du « pop » d'un client. Même le plus faible des bouquets tape plus fort.
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    await vibrerExplosion(0.58);
    const style = impactFeedback.mock.calls[0][0];
    expect(style).not.toBe("light");
  });

  it("obéit à la préférence joueur comme le reste", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    setVibrationsActives(false);
    await vibrerExplosion(1);
    expect(impactFeedback).not.toHaveBeenCalled();
  });
});
