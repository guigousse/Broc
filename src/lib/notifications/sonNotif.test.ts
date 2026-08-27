// @vitest-environment jsdom
/**
 * Le carillon interne remplace le son système d'une notification présentée
 * pendant qu'on joue — voir `sonNotif.ts` pour le pourquoi.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let rappel: (() => void) | undefined;
const unregister = vi.fn(async () => {});
const onNotificationReceived = vi.fn(async (cb: () => void) => {
  rappel = cb;
  return { unregister };
});

vi.mock("@tauri-apps/plugin-notification", () => ({ onNotificationReceived }));

const { installerSonNotif } = await import("./sonNotif");

beforeEach(() => {
  rappel = undefined;
  onNotificationReceived.mockClear();
  unregister.mockClear();
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

function sousTauri(): void {
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
}

describe("sonNotif", () => {
  it("ne s'abonne à rien hors Tauri, et rend un arrêt inoffensif", async () => {
    const jouer = vi.fn();
    const arreter = await installerSonNotif(jouer);
    expect(onNotificationReceived).not.toHaveBeenCalled();
    expect(() => arreter()).not.toThrow();
  });

  it("joue le carillon à chaque notification reçue", async () => {
    sousTauri();
    const jouer = vi.fn();
    await installerSonNotif(jouer);
    expect(onNotificationReceived).toHaveBeenCalledTimes(1);

    rappel?.();
    rappel?.();
    expect(jouer).toHaveBeenCalledTimes(2);
  });

  it("l'arrêt rendu coupe l'abonnement", async () => {
    sousTauri();
    const arreter = await installerSonNotif(vi.fn());
    arreter();
    expect(unregister).toHaveBeenCalled();
  });

  // Une panne du pont de notifs ne doit jamais casser le jeu — même règle que
  // le reste du module (`./index`).
  it("un échec du plugin est avalé", async () => {
    sousTauri();
    onNotificationReceived.mockRejectedValueOnce(new Error("pont mort"));
    const arreter = await installerSonNotif(vi.fn());
    expect(() => arreter()).not.toThrow();
  });
});
