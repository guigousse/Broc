// @vitest-environment jsdom
/**
 * Revue de la Tâche 8 (finding 2) : l'ancien code (`saveEnEchecRef.current`
 * réassigné SYNCHRONEMENT dans le `.then()`) était immunisé contre la
 * concurrence. Le remplacement (`etatSauvegardeRef` mise à jour seulement au
 * rendu) ne l'était pas : `flush` est abonné à la fois à `pagehide` ET à
 * `visibilitychange→hidden` (GameContext.tsx), qu'iOS déclenche tous les
 * deux à la mise en arrière-plan — deux `doSave()` peuvent donc être en vol
 * en même temps. Si les deux réussissent pendant que `enEchec` est vrai, les
 * deux callbacks `.then()` pouvaient lire `enEchec === true` avant que React
 * ne commite le rendu qui l'aurait mis à jour → deux toasts « Sauvegarde
 * rétablie ». Ce test simule exactement ce scénario (les deux événements
 * dans le même tick synchrone) et vérifie qu'un seul toast est émis.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";

const toastSpy = vi.hoisted(() => vi.fn());

// Mocker tout le module évite de dépendre du <ToastProvider> réel (un seul
// toast affiché à la fois, donc invérifiable en DOM si un second appel
// écrase le premier avant lecture) — même choix que saveToastStrictMode.
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

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

describe("GameContext — deux sauvegardes concurrentes au rétablissement (finding 2)", () => {
  it("pagehide + visibilitychange('hidden') simultanés : un seul toast « Sauvegarde rétablie »", async () => {
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
    expect(toastSpy).not.toHaveBeenCalled();

    // Le stockage revient. Scénario iOS réel : `pagehide` ET
    // `visibilitychange→hidden` tirent TOUS LES DEUX à la mise en arrière-
    // plan, dans le même tick synchrone — deux `doSave()` concurrents.
    Storage.prototype.setItem = setItemOriginal;
    const visibilite = vi.spyOn(document, "visibilityState", "get");
    visibilite.mockReturnValue("hidden");
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    visibilite.mockRestore();

    await waitFor(() =>
      expect(result.current.etatSauvegarde.enEchec).toBe(false),
    );
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });
});
