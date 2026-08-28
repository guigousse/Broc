// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTIF_IDS } from "./ids";

const { onAction, invoke, unregister } = vi.hoisted(() => {
  const unregister = vi.fn();
  return {
    unregister,
    onAction: vi.fn<(cb: (n: { id?: number }) => void) => Promise<{ unregister: () => void }>>(),
    invoke: vi.fn<(cmd: string) => Promise<unknown>>(),
  };
});
vi.mock("@tauri-apps/plugin-notification", () => ({ onAction }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const { destinationNotif, installerTapNotif } = await import("./tapNotif");

describe("destinationNotif", () => {
  it("envoie chaque notif de restauration à l'atelier", () => {
    for (const id of NOTIF_IDS.RESTAURATION) {
      expect(destinationNotif(id)).toBe("/atelier");
    }
  });

  it("envoie l'énergie pleine et les rappels de retour au bureau", () => {
    expect(destinationNotif(NOTIF_IDS.ENERGIE_PLEINE)).toBe("/bureau");
    for (const id of NOTIF_IDS.RAPPEL_RETOUR) {
      expect(destinationNotif(id)).toBe("/bureau");
    }
  });

  it("envoie les notifs de quêtes aux quêtes", () => {
    for (const id of [...NOTIF_IDS.QUETES, ...NOTIF_IDS.RAPPEL_QUETES]) {
      expect(destinationNotif(id)).toBe("/quetes");
    }
  });

  it("ne route pas un ID inconnu", () => {
    expect(destinationNotif(9999)).toBeNull();
  });
});

describe("installerTapNotif hors Tauri", () => {
  it("est inerte et ne touche pas au plugin", async () => {
    const surTap = vi.fn();
    const arreter = await installerTapNotif(surTap);
    expect(typeof arreter).toBe("function");
    expect(onAction).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe("installerTapNotif sous Tauri", () => {
  let ecouteur: ((n: { id?: number }) => void) | undefined;

  beforeEach(() => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    onAction.mockImplementation(async (cb) => {
      ecouteur = cb;
      return { unregister };
    });
    invoke.mockResolvedValue(null);
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    ecouteur = undefined;
    onAction.mockReset();
    invoke.mockReset();
    unregister.mockClear();
  });

  it("relaie un tap reçu pendant que l'app tourne", async () => {
    const surTap = vi.fn();
    await installerTapNotif(surTap);
    ecouteur?.({ id: 100 });
    expect(surTap).toHaveBeenCalledWith(100);
  });

  // Lancement à froid : le tap est parti AVANT que le JS n'écoute. Le natif le
  // garde en attente et le JS vient le chercher juste après s'être abonné.
  it("rejoue le tap resté en attente côté natif (lancement à froid)", async () => {
    invoke.mockResolvedValue({ actionId: "tap", notification: { id: 101 } });
    const surTap = vi.fn();
    await installerTapNotif(surTap);
    expect(invoke).toHaveBeenCalledWith("plugin:notification|last_action");
    expect(surTap).toHaveBeenCalledWith(101);
  });

  it("ne relaie pas deux fois le même tap arrivé par les deux voies", async () => {
    invoke.mockImplementation(async () => {
      // Le tap tombe entre l'abonnement et la relecture : les deux voies le voient.
      ecouteur?.({ id: 102 });
      return { actionId: "tap", notification: { id: 102 } };
    });
    const surTap = vi.fn();
    await installerTapNotif(surTap);
    expect(surTap).toHaveBeenCalledTimes(1);
  });

  it("ignore un rejet (fermeture) de la notif", async () => {
    invoke.mockResolvedValue({ actionId: "dismiss", notification: { id: 100 } });
    const surTap = vi.fn();
    await installerTapNotif(surTap);
    expect(surTap).not.toHaveBeenCalled();
  });

  it("survit à une relecture qui échoue", async () => {
    invoke.mockRejectedValue(new Error("pont cassé"));
    const surTap = vi.fn();
    await expect(installerTapNotif(surTap)).resolves.toBeTypeOf("function");
    ecouteur?.({ id: 100 });
    expect(surTap).toHaveBeenCalledWith(100);
  });

  it("coupe l'abonnement à l'arrêt", async () => {
    const arreter = await installerTapNotif(vi.fn());
    arreter();
    expect(unregister).toHaveBeenCalled();
  });
});
