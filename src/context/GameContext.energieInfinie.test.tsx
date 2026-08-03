// @vitest-environment jsdom
/**
 * Achat « Énergie infinie » : le débit est coupé et la jauge est calée au max
 * pour TOUTE partie (drapeau device hors save — y compris une vieille save à
 * jauge basse chargée après l'achat, et l'achat réalisé en cours de partie).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { definirEnergieInfinie } from "@/lib/iap/energieInfinie";
import { ENERGIE_MAX } from "@/lib/energie";

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

describe("GameContext — énergie infinie", () => {
  it("sans achat : consommerEnergie débite normalement", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.consommerEnergie(2);
    });
    expect(result.current.state!.energie).toBe(ENERGIE_MAX - 2);
  });

  it("avec achat : consommerEnergie ne débite plus", async () => {
    definirEnergieInfinie(true);
    const result = await setupNouvellePartie();
    act(() => {
      result.current.consommerEnergie(2);
    });
    expect(result.current.state!.energie).toBe(ENERGIE_MAX);
  });

  it("achat en cours de partie : la jauge basse remonte au max via l'événement", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.consommerEnergie(4);
    });
    expect(result.current.state!.energie).toBe(ENERGIE_MAX - 4);
    act(() => {
      definirEnergieInfinie(true);
    });
    await waitFor(() => expect(result.current.state!.energie).toBe(ENERGIE_MAX));
  });
});
