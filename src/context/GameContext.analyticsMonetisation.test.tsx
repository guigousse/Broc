// @vitest-environment jsdom
/**
 * Instrumentation de la monétisation : `energie_epuisee` sur `consommerEnergie`.
 *
 * Même piège que les tâches 6-7 : la transition (ici vers zéro) est décidée
 * AVANT le `setState`, sur `stateRef.current`, jamais dans l'updater (React
 * 19 StrictMode rejoue l'updater deux fois).
 *
 * Les événements de pub (`pub_demandee`/`pub_terminee`) et `iap_ecran_vu` sont
 * couverts respectivement par `src/lib/ads/analyticsPub.test.ts` et
 * `src/components/mobile/EnergieRecharge.test.tsx` : ils ne dépendent pas de
 * GameContext.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { ENERGIE_MAX } from "@/lib/energie";
import {
  EVENEMENTS,
  StubAnalyticsProvider,
  reinitialiserAnalyticsPourTest,
} from "@/lib/analytics/analytics";
import { definirLecteurContexte } from "@/lib/analytics/contexte";

// GameProvider appelle useRouter() (nouvellePartie → router.push("/bureau")).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Évite un vrai appel réseau (HttpTimeSource interroge timeapi.io) déclenché
// par l'effet d'ancrage temporel du provider.
vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

let stub: StubAnalyticsProvider;

beforeEach(() => {
  stub = new StubAnalyticsProvider();
  reinitialiserAnalyticsPourTest(stub);
  definirLecteurContexte(() => ({ jour: 1, niveau: 1 }));
});

afterEach(() => {
  reinitialiserAnalyticsPourTest();
  definirLecteurContexte(null);
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

describe("GameContext — energie_epuisee", () => {
  it("n'est émis qu'à la transition vers zéro, jamais tant que l'énergie y reste", async () => {
    const result = await setupNouvellePartie();
    expect(result.current.state!.energie).toBe(ENERGIE_MAX);

    // Première consommation : entame la jauge, pas encore à zéro.
    act(() => {
      result.current.consommerEnergie(ENERGIE_MAX - 1);
    });
    expect(result.current.state!.energie).toBe(1);
    expect(
      stub.appels.filter((a) => a.nom === EVENEMENTS.energieEpuisee),
    ).toHaveLength(0);

    // Deuxième consommation : la vraie transition vers zéro.
    act(() => {
      result.current.consommerEnergie(1);
    });
    expect(result.current.state!.energie).toBe(0);
    expect(
      stub.appels.filter((a) => a.nom === EVENEMENTS.energieEpuisee),
    ).toHaveLength(1);

    // Retenter à zéro (ex. clic redondant) : aucun deuxième événement.
    act(() => {
      result.current.consommerEnergie(1);
    });
    expect(result.current.state!.energie).toBe(0);
    expect(
      stub.appels.filter((a) => a.nom === EVENEMENTS.energieEpuisee),
    ).toHaveLength(1);
  });

  it("porte le contexte de jeu", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.consommerEnergie(ENERGIE_MAX);
    });
    const appel = stub.appels.find((a) => a.nom === EVENEMENTS.energieEpuisee);
    expect(appel?.params).toMatchObject({ jour: 1, jour_tranche: "1-7", niveau: 1 });
  });

  it("achat « énergie infinie » : le débit est coupé, jamais d'événement", async () => {
    const result = await setupNouvellePartie();
    // energieInfinieActive() coupe consommerEnergie AVANT toute mesure — le
    // joueur qui a acheté l'IAP ne déclenche plus jamais ce parcours, c'est
    // voulu (cf. brief tâche 8).
    const { definirEnergieInfinie } = await import("@/lib/iap/energieInfinie");
    definirEnergieInfinie(true);
    try {
      act(() => {
        result.current.consommerEnergie(ENERGIE_MAX);
      });
      expect(result.current.state!.energie).toBe(ENERGIE_MAX);
      expect(
        stub.appels.filter((a) => a.nom === EVENEMENTS.energieEpuisee),
      ).toHaveLength(0);
    } finally {
      definirEnergieInfinie(false);
    }
  });
});
