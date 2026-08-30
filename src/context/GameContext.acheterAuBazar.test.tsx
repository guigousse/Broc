// @vitest-environment jsdom
/**
 * Revue finale (I1) : `acheterAuBazar` calculait son résultat une seule fois
 * sur `stateRef.current` (hors de l'updater) puis l'appliquait tel quel via
 * `setState((prev) => (prev ? r.state : prev))` — `prev` n'était lu que pour
 * savoir si une partie existait, JAMAIS pour re-vérifier solde/disponibilité
 * ni pour servir de base à la fusion. Deux achats synchrones (même clic
 * double, même course avec le settle d'énergie/quêtes/Bazar qui tourne
 * toutes les 60 s dans ce contexte) faisaient donc perdre le premier : le
 * second `setState` réécrivait un instantané entier calculé AVANT le
 * premier achat, l'effaçant.
 *
 * Le correctif reprend le patron `acheterObjet` (juste au-dessus dans
 * GameContext.tsx) : pré-check informatif sur `stateRef.current`, mais
 * l'écriture réelle rejoue `acheterLotPieces`/`acheterVitrine` DANS
 * l'updater, sur `prev` — la seule source de vérité au moment où React
 * applique la mise à jour.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { cleSlot } from "@/lib/storage/slots";
import { JOUR_OUVERTURE_BAZAR } from "@/lib/bazar/ouverture";
import type { GameState } from "@/types/game";

// GameProvider appelle useRouter() (nouvellePartie → router.push("/bureau")).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Évite un vrai appel réseau (HttpTimeSource interroge timeapi.io).
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

/**
 * Save au jour d'ouverture du Bazar, avec 2 jetons — de quoi payer DEUX lots
 * de pièces (1 jeton chacun, cf. `etal.ts`). Le Bazar lui-même se compose
 * tout seul à l'hydratation (le `sync()` du GameContext appelle déjà
 * `rafraichirPeriodiques` au montage) : pas besoin de le pré-fabriquer ici.
 */
async function setupPartieAvecJetons() {
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
  save.jourActuel = JOUR_OUVERTURE_BAZAR;
  save.jetons = 2;
  window.localStorage.setItem(cleSlot(1), JSON.stringify(save));
  unmount();

  const remonte = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(remonte.result.current.state).not.toBeNull());
  await waitFor(() => expect(remonte.result.current.state!.bazar).toBeDefined());
  return remonte.result;
}

describe("GameContext.acheterAuBazar — atomicité (I1)", () => {
  it("deux achats synchrones du même lot débitent et livrent DEUX fois, pas une", async () => {
    const result = await setupPartieAvecJetons();
    const cat = result.current.state!.bazar!.lotsPieces[0].categorie;
    const piecesAvant = result.current.state!.piecesAmelioration[cat];

    // Synchrones, dans le MÊME batch : c'est exactement la course que
    // `stateRef.current` (lu une fois, hors updater) ne pouvait pas voir.
    act(() => {
      result.current.acheterAuBazar({ type: "pieces", index: 0 });
      result.current.acheterAuBazar({ type: "pieces", index: 0 });
    });

    expect(result.current.state!.jetons).toBe(0);
    expect(result.current.state!.piecesAmelioration[cat]).toBe(piecesAvant + 10);
  });

  it("refuse le second achat sans rien perdre du premier quand les jetons ne couvrent qu'un seul lot", async () => {
    const result = await setupPartieAvecJetons();
    const cat = result.current.state!.bazar!.lotsPieces[0].categorie;
    const piecesAvant = result.current.state!.piecesAmelioration[cat];
    // Dépense un premier jeton (solde initial 2) pour ne laisser que le
    // strict nécessaire à UN SEUL des deux achats synchrones qui suivent.
    // NB_LOTS_PIECES = 1 depuis 2026-08-30 : un seul lot en vente, donc les
    // trois achats de ce test portent tous sur `index: 0`.
    act(() => {
      result.current.acheterAuBazar({ type: "pieces", index: 0 });
    });
    expect(result.current.state!.jetons).toBe(1);

    act(() => {
      // Deux achats du même lot (1 jeton chacun) alors qu'il n'en reste
      // qu'un : le premier doit passer, le second doit être refusé — et
      // SURTOUT ne pas effacer l'effet des deux premiers.
      result.current.acheterAuBazar({ type: "pieces", index: 0 });
      result.current.acheterAuBazar({ type: "pieces", index: 0 });
    });

    expect(result.current.state!.jetons).toBe(0);
    expect(result.current.state!.piecesAmelioration[cat]).toBe(piecesAvant + 10);
  });
});
