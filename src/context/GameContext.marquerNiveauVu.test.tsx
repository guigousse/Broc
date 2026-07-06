// @vitest-environment jsdom
/**
 * Régression ciblée sur `marquerNiveauVu` : l'état « dernier niveau célébré »
 * qui pilotera l'écran de level-up (Task 4). Avance d'UN cran par appel,
 * clampé au niveau courant, avec le même re-check atomique DANS l'updater de
 * `setState` que les autres actions gate/quota de ce fichier (cf.
 * GameContext.utiliserActive.test.tsx).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { xpRequisPourNiveauBrocanteur } from "@/lib/xp";

// GameProvider appelle useRouter() (nouvellePartie → router.push("/bureau")).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Évite un vrai appel réseau (HttpTimeSource interroge timeapi.io) déclenché
// par l'effet d'ancrage temporel du provider. Résout en "pas de temps de
// confiance" — le provider retombe sur Date.now() (dégradation gracieuse).
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

/** Monte le provider, attend l'hydratation initiale (localStorage vide → state
 *  null), puis démarre une nouvelle partie. Retourne le résultat du hook. */
async function setupNouvellePartie() {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  return result;
}

/**
 * Crédite exactement de quoi atteindre `niveauCible` niveaux de Brocanteur
 * depuis l'état courant, en calculant l'XP nécessaire pour franchir le seuil
 * cumulé (cf. `xpRequisPourNiveauBrocanteur` — le seuil croît avec le niveau,
 * un gain fixe ne suffit qu'au tout premier niveau).
 */
function atteindreNiveau(
  result: ReturnType<typeof renderHook<ReturnType<typeof useGame>, unknown>>["result"],
  niveauCible: number,
) {
  const brocanteur = result.current.state!.brocanteur;
  const seuilCible = xpRequisPourNiveauBrocanteur(niveauCible);
  const gain = seuilCible - brocanteur.xp;
  act(() => {
    result.current.gagnerXPBrocanteur(gain);
  });
}

describe("GameContext.marquerNiveauVu — célébration de level-up", () => {
  it("nouvelle partie : niveauVu 0, rien en attente", async () => {
    const result = await setupNouvellePartie();
    expect(result.current.state!.niveauVu).toBe(0);
    expect(result.current.state!.brocanteur.niveau).toBe(0);
  });

  it("un gain d'XP crée l'écart, marquerNiveauVu avance d'UN cran", async () => {
    const result = await setupNouvellePartie();
    atteindreNiveau(result, 2);
    expect(result.current.state!.brocanteur.niveau).toBeGreaterThanOrEqual(2);
    expect(result.current.state!.niveauVu).toBe(0);

    act(() => {
      result.current.marquerNiveauVu();
    });
    expect(result.current.state!.niveauVu).toBe(1);

    act(() => {
      result.current.marquerNiveauVu();
    });
    expect(result.current.state!.niveauVu).toBe(2);

    // Plus rien à célébrer : no-op, reste à 2.
    act(() => {
      result.current.marquerNiveauVu();
    });
    expect(result.current.state!.niveauVu).toBe(2);
  });

  it("atomique : deux appels dans le même tick n'avancent que d'un cran", async () => {
    const result = await setupNouvellePartie();
    // Un seul niveau d'écart : le 2e appel doit être un no-op (déjà à ras du
    // niveau courant), pas une double avance.
    atteindreNiveau(result, 1);

    act(() => {
      result.current.marquerNiveauVu();
      result.current.marquerNiveauVu();
    });

    expect(result.current.state!.niveauVu).toBe(1);
  });
});
