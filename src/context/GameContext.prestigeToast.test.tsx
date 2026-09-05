// @vitest-environment jsdom
/**
 * Prestige (2026-09-05) : au niveau 100, chaque tranche de 500 XP verse un
 * Bazarcoin. Le seul retour visible hors compteur est un toast « +1 Bazarcoin »
 * dans la langue du joueur — émis UNE fois par palier franchi, jamais au
 * chargement d'une save (un joueur qui rouvre le jeu n'a rien gagné).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { ToastProvider } from "@/components/ui/Toast";
import { cleSlot } from "@/lib/storage/slots";
import { persisterLocale } from "@/lib/i18n/locales";
import { DICTIONNAIRES, tr } from "@/lib/i18n/ui";
import { NIVEAU_BROCANTEUR_MAX, xpRequisPourNiveauBrocanteur } from "@/lib/xp";
import type { GameState } from "@/types/game";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  persisterLocale("fr");
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <GameProvider>{children}</GameProvider>
    </ToastProvider>
  );
}

/** Partie chargée au niveau 100 avec `excedent` XP au-delà du seuil. */
async function setupAuPlafond(excedent: number) {
  const { result, unmount } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(
    () => expect(window.localStorage.getItem(cleSlot(1))).not.toBeNull(),
    { timeout: 3000 },
  );
  const save = JSON.parse(window.localStorage.getItem(cleSlot(1))!) as GameState;
  save.brocanteur = {
    xp: xpRequisPourNiveauBrocanteur(NIVEAU_BROCANTEUR_MAX) + excedent,
    niveau: NIVEAU_BROCANTEUR_MAX,
    pointsDisponibles: 0,
  };
  save.jetons = 0;
  window.localStorage.setItem(cleSlot(1), JSON.stringify(save));
  unmount();

  const remonte = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(remonte.result.current.state).not.toBeNull());
  return remonte.result;
}

describe("GameContext — toast « +1 Bazarcoin » de prestige", () => {
  it("le 500ᵉ XP au plafond crédite le jeton et affiche le toast en grec", async () => {
    persisterLocale("el");
    const result = await setupAuPlafond(0);
    // Chargement : rien n'est dû, pas de toast.
    expect(screen.queryByText(DICTIONNAIRES.el.raisons.prestigeJeton)).toBeNull();

    act(() => {
      result.current.gagnerXPBrocanteur(499);
    });
    expect(result.current.state!.jetons).toBe(0);
    expect(screen.queryByText(DICTIONNAIRES.el.raisons.prestigeJeton)).toBeNull();

    act(() => {
      result.current.gagnerXPBrocanteur(1);
    });
    expect(result.current.state!.jetons).toBe(1);
    await waitFor(() =>
      expect(screen.getByText(DICTIONNAIRES.el.raisons.prestigeJeton)).toBeTruthy(),
    );
  });

  it("plusieurs paliers d'un coup : un seul toast, au pluriel", async () => {
    const result = await setupAuPlafond(0);
    act(() => {
      result.current.gagnerXPBrocanteur(1200);
    });
    expect(result.current.state!.jetons).toBe(2);
    await waitFor(() =>
      expect(
        screen.getByText(tr(DICTIONNAIRES.fr.raisons.prestigeJetons, { n: 2 })),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(DICTIONNAIRES.fr.raisons.prestigeJeton)).toBeNull();
  });

  it("charger une save qui a déjà des paliers derrière elle n'affiche rien", async () => {
    await setupAuPlafond(500 * 7 + 20);
    expect(screen.queryByText(DICTIONNAIRES.fr.raisons.prestigeJeton)).toBeNull();
    expect(
      screen.queryByText(tr(DICTIONNAIRES.fr.raisons.prestigeJetons, { n: 7 })),
    ).toBeNull();
  });
});
