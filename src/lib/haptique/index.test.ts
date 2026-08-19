// @vitest-environment jsdom
/**
 * Pont haptique : sous runtime Tauri il tape le plugin natif une fois par
 * appel ; hors Tauri (navigateur, `next dev`, tests) il ne fait rien ; et une
 * panne du plugin ne doit jamais remonter à l'appelant — une vibration ratée
 * n'a pas le droit de casser l'apparition d'un acheteur.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const impactFeedback = vi.fn(async () => {});

vi.mock("@tauri-apps/plugin-haptics", () => ({
  impactFeedback,
}));

const { vibrerApparition } = await import("./index");
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
