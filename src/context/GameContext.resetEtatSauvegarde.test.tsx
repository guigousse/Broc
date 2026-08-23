// @vitest-environment jsdom
/**
 * Ruling R14 (revue Tâche 8) : `reset()` doit effacer `etatSauvegarde` — sinon
 * le bandeau persistant de `BandeauSauvegarde` continuerait d'afficher
 * « ta progression n'est pas enregistrée » sur une partie tout juste
 * réinitialisée qui n'a encore rien tenté de sauvegarder. Une fausse alerte
 * mine exactement la confiance que ce bandeau est censé construire. Si le
 * disque est réellement toujours en panne, le prochain échec de sauvegarde
 * (dans les 400 ms du debounce) relève l'alerte — la remise à zéro ne coûte
 * rien.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

const setItemOriginal = Storage.prototype.setItem;

beforeEach(() => {
  // L'échec de save passe par console.warn (localGameRepository) : silence.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  Storage.prototype.setItem = setItemOriginal;
  vi.restoreAllMocks();
  cleanup();
  window.localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <GameProvider>{children}</GameProvider>
    </ToastProvider>
  );
}

describe("GameContext — reset() efface l'échec de sauvegarde (Ruling R14)", () => {
  it("etatSauvegarde revient à { enEchec: false } après reset()", async () => {
    const { result } = renderHook(() => useGame(), { wrapper });
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

    // Réinitialisation de la partie : plus aucune alerte à afficher tant
    // qu'aucune sauvegarde n'a encore échoué pour la nouvelle partie.
    act(() => {
      result.current.reset();
    });
    expect(result.current.etatSauvegarde).toEqual({ enEchec: false });
  });
});
