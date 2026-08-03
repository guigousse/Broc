// @vitest-environment jsdom
/**
 * Audit 2026-08-03 (H4) : les toasts « Sauvegarde impossible » / « Sauvegarde
 * rétablie » — le SEUL avertissement de perte de progression du jeu — étaient
 * des littéraux français en dur dans GameContext, alors que le jeu est vendu
 * en 4 langues. Ils doivent passer par le dictionnaire de la locale courante
 * (raisonLocalisee), comme toutes les autres raisons.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { ToastProvider } from "@/components/ui/Toast";
import { persisterLocale } from "@/lib/i18n/locales";
import { DICTIONNAIRES } from "@/lib/i18n/ui";

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

describe("GameContext — toasts de sauvegarde localisés", () => {
  it("échec puis rétablissement : les deux toasts parlent la langue du joueur (grec)", async () => {
    // Le joueur joue en grec — persisté AVANT de casser le stockage.
    persisterLocale("el");

    const { result } = renderHook(() => useGame(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => {
      result.current.nouvellePartie();
    });
    await waitFor(() => expect(result.current.state).not.toBeNull());

    // Stockage indisponible (quota plein / navigation privée simulés).
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError (simulé)");
    };
    // Flush immédiat de l'auto-save (sans attendre le debounce 400 ms).
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    await waitFor(() =>
      expect(
        screen.getByText(DICTIONNAIRES.el.raisons.sauvegardeImpossible),
      ).toBeTruthy(),
    );

    // Le stockage revient : le toast de rétablissement doit aussi être grec.
    Storage.prototype.setItem = setItemOriginal;
    act(() => {
      result.current.ajusterBudget(1);
      window.dispatchEvent(new Event("pagehide"));
    });
    await waitFor(() =>
      expect(
        screen.getByText(DICTIONNAIRES.el.raisons.sauvegardeRetablie),
      ).toBeTruthy(),
    );
  });
});
