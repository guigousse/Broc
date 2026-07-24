// @vitest-environment jsdom
/**
 * Actions du circuit gazette (spec 2026-07-24) : gazette offerte sans débit
 * ni grand livre, fin de tuto, refus du lundi, et reset hebdo de
 * gazetteRefusee au refresh de la Gazette.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

async function setupNouvellePartie() {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  return result;
}

describe("GameContext — circuit gazette", () => {
  it("nouvelle partie : tutoGazette='aFaire', gazetteRefusee=false", async () => {
    const result = await setupNouvellePartie();
    expect(result.current.state!.tutoGazette).toBe("aFaire");
    expect(result.current.state!.gazetteRefusee).toBe(false);
  });

  it("ouvrirGazetteOfferte : achetée SANS débit ni ligne au grand livre", async () => {
    const result = await setupNouvellePartie();
    const budgetAvant = result.current.state!.budget;
    const nbLignesAvant = result.current.state!.grandLivre.length;
    act(() => {
      result.current.ouvrirGazetteOfferte();
    });
    expect(result.current.state!.gazetteAchetee).toBe(true);
    expect(result.current.state!.budget).toBe(budgetAvant);
    expect(result.current.state!.grandLivre.length).toBe(nbLignesAvant);
  });

  it("terminerTutoGazette : tutoGazette passe à 'faite'", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.terminerTutoGazette();
    });
    expect(result.current.state!.tutoGazette).toBe("faite");
  });

  it("refuserGazette : gazetteRefusee=true, puis reset au refresh hebdo", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.refuserGazette();
    });
    expect(result.current.state!.gazetteRefusee).toBe(true);
    // Avance jusqu'au-delà du prochain refresh (aligné lundi, ≤ 8 jours).
    act(() => {
      result.current.avancerJour(8);
    });
    expect(result.current.state!.gazetteRefusee).toBe(false);
    // Le refresh remet aussi l'édition « non achetée » (comportement existant).
    expect(result.current.state!.gazetteAchetee).toBe(false);
  });
});
