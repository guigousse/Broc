// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";

const { installerTapNotif, arreter, replace, jeu } = vi.hoisted(() => {
  const arreter = vi.fn();
  return {
    arreter,
    replace: vi.fn(),
    jeu: { state: null as unknown, isHydrated: false },
    installerTapNotif: vi.fn<(surTap: (id: number) => void) => Promise<() => void>>(
      async () => arreter,
    ),
  };
});
vi.mock("@/lib/notifications/tapNotif", async () => {
  const reel = await vi.importActual<typeof import("@/lib/notifications/tapNotif")>(
    "@/lib/notifications/tapNotif",
  );
  return { destinationNotif: reel.destinationNotif, installerTapNotif };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/context/GameContext", () => ({ useGame: () => jeu }));

const { NotifTapBootstrap } = await import("./NotifTapBootstrap");

/** Rend le composant et renvoie le callback branché par installerTapNotif. */
async function monter() {
  const vue = render(<NotifTapBootstrap />);
  await waitFor(() => expect(installerTapNotif).toHaveBeenCalledTimes(1));
  return { vue, surTap: installerTapNotif.mock.calls[0][0] };
}

afterEach(() => {
  cleanup();
  installerTapNotif.mockClear();
  arreter.mockClear();
  replace.mockClear();
  jeu.state = null;
  jeu.isHydrated = false;
});

describe("NotifTapBootstrap", () => {
  it("ouvre l'atelier au tap sur une notif de restauration, partie chargée", async () => {
    jeu.state = { ok: true };
    jeu.isHydrated = true;
    const { surTap } = await monter();
    act(() => surTap(100));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/atelier"));
  });

  // Lancement à froid : le tap est relu avant que la sauvegarde ne soit
  // chargée. Naviguer tout de suite ferait rebondir sur le menu (le layout du
  // QG renvoie à « / » tant qu'il n'y a pas d'état) : on attend l'hydratation.
  it("attend l'hydratation avant de naviguer", async () => {
    const { vue, surTap } = await monter();
    act(() => surTap(100));
    expect(replace).not.toHaveBeenCalled();
    jeu.state = { ok: true };
    jeu.isHydrated = true;
    vue.rerender(<NotifTapBootstrap />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/atelier"));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("reste au menu s'il n'y a aucune partie", async () => {
    jeu.isHydrated = true;
    const { surTap } = await monter();
    act(() => surTap(100));
    await new Promise((r) => setTimeout(r, 0));
    expect(replace).not.toHaveBeenCalled();
  });

  it("ignore une notif sans destination", async () => {
    jeu.state = { ok: true };
    jeu.isHydrated = true;
    const { surTap } = await monter();
    act(() => surTap(9999));
    await new Promise((r) => setTimeout(r, 0));
    expect(replace).not.toHaveBeenCalled();
  });

  it("coupe l'abonnement au démontage", async () => {
    const { vue } = await monter();
    vue.unmount();
    await waitFor(() => expect(arreter).toHaveBeenCalled());
  });
});
