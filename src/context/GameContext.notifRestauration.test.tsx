// @vitest-environment jsdom
/**
 * Notif « objet restauré » : l'échéance OS est posée en horloge murale via un
 * écart temps-de-confiance/mural capturé À LA PROGRAMMATION. L'ancre de temps
 * étant reposée à chaque sync réseau, cet écart se périme — il faut donc
 * resynchroniser au passage en arrière-plan (dernier instant où l'app peut
 * corriger l'échéance avant le gel de la webview), comme la notif énergie.
 * Sans ce filet, une échéance posée sur une ancre non corrigée sonne avec
 * de l'avance alors que l'app affiche encore du temps restant.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import type { ObjetEnRestau } from "@/lib/notifications/restaurationNotif";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

const synchroniser =
  vi.fn<(objets: ObjetEnRestau[], now: number, locale: string) => Promise<void>>();

vi.mock("@/lib/notifications/restaurationNotif", () => ({
  synchroniserNotifsRestauration: (
    objets: ObjetEnRestau[],
    now: number,
    locale: string,
  ) => synchroniser(objets, now, locale),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

async function setupPartie() {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  return result;
}

beforeEach(() => {
  synchroniser.mockReset();
  synchroniser.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("GameContext — notif restauration et arrière-plan", () => {
  it("resynchronise au passage en arrière-plan (pagehide)", async () => {
    await setupPartie();
    await waitFor(() => expect(synchroniser).toHaveBeenCalled());
    synchroniser.mockClear();

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    await waitFor(() => expect(synchroniser).toHaveBeenCalledTimes(1));
  });

  it("resynchronise quand la page redevient cachée (visibilitychange)", async () => {
    await setupPartie();
    await waitFor(() => expect(synchroniser).toHaveBeenCalled());
    synchroniser.mockClear();

    const visibilite = vi.spyOn(document, "visibilityState", "get");
    visibilite.mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(synchroniser).toHaveBeenCalledTimes(1));
    visibilite.mockRestore();
  });
});
