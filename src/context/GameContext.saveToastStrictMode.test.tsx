// @vitest-environment jsdom
/**
 * Ruling R13 (revue Tâche 8) : le toast de rétablissement était déclenché
 * DEPUIS l'intérieur de l'updater fonctionnel passé à `setEtatSauvegarde`.
 * Comme pour `logEvenement` (cf. GameContext.analyticsTuto.test.tsx), un
 * updater React n'est pas garanti de tourner une seule fois — StrictMode le
 * rejoue en dev — donc un effet de bord dedans peut doubler le toast. Ce
 * test monte le provider sous <StrictMode> POUR DE VRAI (pas seulement
 * documenté) et vérifie qu'un seul toast de rétablissement est émis sur la
 * transition échec→succès.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";

const toastSpy = vi.hoisted(() => vi.fn());

// GameContext ne consomme que `useToastSafe` — mocker tout le module évite
// de dépendre du <ToastProvider> réel (un seul toast affiché à la fois, donc
// invérifiable en DOM si un second appel écrase le premier avant lecture).
vi.mock("@/components/ui/Toast", () => ({
  useToastSafe: () => ({ toast: toastSpy }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

const setItemOriginal = Storage.prototype.setItem;

beforeEach(() => {
  toastSpy.mockClear();
  // L'échec de save passe par console.warn (localGameRepository) : silence.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  Storage.prototype.setItem = setItemOriginal;
  vi.restoreAllMocks();
  cleanup();
  window.localStorage.clear();
});

function wrapperStrict({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <GameProvider>{children}</GameProvider>
    </StrictMode>
  );
}

describe("GameContext — toast de rétablissement sous StrictMode (Ruling R13)", () => {
  it("un seul toast « Sauvegarde rétablie », malgré le double-rendu StrictMode", async () => {
    const { result } = renderHook(() => useGame(), { wrapper: wrapperStrict });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => {
      result.current.nouvellePartie();
    });
    await waitFor(() => expect(result.current.state).not.toBeNull());

    // Stockage indisponible : provoque un échec de sauvegarde.
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError (simulé)");
    };
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    await waitFor(() =>
      expect(result.current.etatSauvegarde.enEchec).toBe(true),
    );
    expect(toastSpy).not.toHaveBeenCalled();

    // Le stockage revient : une seule sauvegarde réussie, un seul toast.
    Storage.prototype.setItem = setItemOriginal;
    act(() => {
      result.current.ajusterBudget(1);
      window.dispatchEvent(new Event("pagehide"));
    });
    await waitFor(() =>
      expect(result.current.etatSauvegarde.enEchec).toBe(false),
    );
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });
});
