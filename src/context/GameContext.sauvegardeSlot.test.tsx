// @vitest-environment jsdom
/**
 * Régression : l'état en mémoire appartient au slot d'où il a été chargé et
 * ne doit JAMAIS s'écrire ailleurs. Au lancement d'une autre partie depuis
 * l'écran titre (detacherPartie → changerSlotActif → navigation dure), le
 * flush pagehide/visibilitychange de l'effet d'auto-save peut tirer AVANT que
 * React ne commite le `state null` de `detacherPartie` : sans garde, il
 * sauvait l'ancienne partie dans le slot fraîchement activé (clé principale
 * ET copie de secours) — écrasement définitif de la partie qu'on voulait
 * charger.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import {
  changerSlotActif,
  cleBackup,
  cleSlot,
  CLE_INDEX,
} from "@/lib/storage/slots";
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
 * Fabrique une save valide (version courante, aucun champ à migrer) en
 * laissant le provider lui-même la créer et la persister dans le slot 1,
 * puis la relit brute. Évite de maintenir un GameState de test à la main.
 */
async function genererSaveValide(): Promise<string> {
  const { result, unmount } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  // L'auto-save est débouncée (400 ms) : on attend l'écriture effective.
  await waitFor(
    () => expect(window.localStorage.getItem(cleSlot(1))).not.toBeNull(),
    { timeout: 3000 },
  );
  const raw = window.localStorage.getItem(cleSlot(1))!;
  unmount();
  window.localStorage.clear();
  return raw;
}

/** Seed deux parties distinctes (budgets marqueurs) + index, slot 1 actif. */
function seedDeuxSlots(template: string): void {
  const save1 = JSON.parse(template) as GameState;
  const save2 = JSON.parse(template) as GameState;
  save1.budget = 111;
  save2.budget = 222;
  window.localStorage.setItem(cleSlot(1), JSON.stringify(save1));
  window.localStorage.setItem(cleSlot(2), JSON.stringify(save2));
  window.localStorage.setItem(
    CLE_INDEX,
    JSON.stringify({
      actif: 1,
      slots: {
        1: { nom: null, derniereSession: 1000 },
        2: { nom: null, derniereSession: 1000 },
        3: null,
      },
    }),
  );
}

function budgetDuSlot(n: 1 | 2): number {
  return (JSON.parse(window.localStorage.getItem(cleSlot(n))!) as GameState)
    .budget;
}

describe("GameContext — la save ne s'écrit que dans son propre slot", () => {
  it("pagehide après bascule de slot : n'écrase jamais le slot cible", async () => {
    const template = await genererSaveValide();
    seedDeuxSlots(template);

    // Hydrate depuis le slot 1 (partie au budget 111).
    const { result } = renderHook(() => useGame(), { wrapper });
    await waitFor(() => expect(result.current.state).not.toBeNull());
    expect(result.current.state!.budget).toBe(111);

    // Course réelle du lancement d'une autre partie : au noir de l'iris,
    // detacherPartie() est appelé mais React n'a PAS encore commité (les
    // listeners du flush tiennent toujours l'état de la save 1), l'index a
    // déjà basculé sur le slot 2, et la navigation dure déclenche pagehide.
    // On simule le pire ordonnancement : bascule + pagehide synchrones,
    // avant tout commit React.
    changerSlotActif(2);
    window.dispatchEvent(new Event("pagehide"));

    // Le slot 2 doit rester intact (budget 222), clé principale ET backup.
    expect(budgetDuSlot(2)).toBe(222);
    expect(window.localStorage.getItem(cleBackup(2))).toBeNull();
  });

  it("pagehide sans bascule : le flush écrit bien dans son propre slot", async () => {
    const template = await genererSaveValide();
    seedDeuxSlots(template);

    const { result } = renderHook(() => useGame(), { wrapper });
    await waitFor(() => expect(result.current.state).not.toBeNull());

    act(() => {
      result.current.ajusterBudget(9);
    });
    // Flush immédiat (sans attendre le debounce) : la mutation doit partir
    // dans le slot 1, celui de la partie chargée.
    window.dispatchEvent(new Event("pagehide"));

    expect(budgetDuSlot(1)).toBe(120);
    expect(budgetDuSlot(2)).toBe(222);
  });
});
