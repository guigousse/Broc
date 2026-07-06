// @vitest-environment jsdom
/**
 * Régression ciblée sur `utiliserActive` : gating par niveau/compétence,
 * consommation de quota journalier, et re-check atomique DANS l'updater de
 * `setState` (même discipline que `debloquerCompetence`, cf.
 * GameContext.debloquerCompetence.test.tsx). Ce type de logique (pré-check +
 * re-check atomique) a déjà causé des bugs de double-dépense dans ce projet —
 * d'où ce test dédié, qui exerce le vrai `GameProvider` (aucun mock de la
 * logique testée).
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

describe("GameContext.utiliserActive — gating, quota et atomicité", () => {
  it("refus — active verrouillée : niveau 0 pour 'flair' (requis 5)", async () => {
    const result = await setupNouvellePartie();
    expect(result.current.state!.brocanteur.niveau).toBe(0);

    let res: boolean | undefined;
    act(() => {
      res = result.current.utiliserActive("flair");
    });

    expect(res).toBe(false);
    expect(result.current.state!.activesUtilisees?.flair).toBeUndefined();
  });

  it("succès : niveau ≥ 5 débloque 'flair', 1er usage du jour consigné", async () => {
    const result = await setupNouvellePartie();
    atteindreNiveau(result, 5);
    expect(result.current.state!.brocanteur.niveau).toBeGreaterThanOrEqual(5);

    let res: boolean | undefined;
    act(() => {
      res = result.current.utiliserActive("flair");
    });

    expect(res).toBe(true);
    expect(result.current.state!.activesUtilisees!.flair).toEqual({
      jour: result.current.state!.jourActuel,
      usages: 1,
    });
  });

  it("épuisement : le 2e appel le même jour échoue, usages reste à 1", async () => {
    const result = await setupNouvellePartie();
    atteindreNiveau(result, 5);

    act(() => {
      result.current.utiliserActive("flair");
    });
    expect(result.current.state!.activesUtilisees!.flair!.usages).toBe(1);

    let res: boolean | undefined;
    act(() => {
      res = result.current.utiliserActive("flair");
    });

    expect(res).toBe(false);
    expect(result.current.state!.activesUtilisees!.flair!.usages).toBe(1);
  });

  it("atomicité : deux appels dans le même tick ne consomment qu'une fois", async () => {
    const result = await setupNouvellePartie();
    atteindreNiveau(result, 5);

    // Les deux appels sont émis dans le même act() (même batch React), avant
    // tout re-rendu — c'est la course que corrige le re-check atomique DANS
    // l'updater de setState.
    act(() => {
      result.current.utiliserActive("flair");
      result.current.utiliserActive("flair");
    });

    expect(result.current.state!.activesUtilisees!.flair!.usages).toBe(1);
  });

  it("quota 3 : 'fouille' autorise trois usages puis refuse le quatrième", async () => {
    const result = await setupNouvellePartie();
    atteindreNiveau(result, 9); // requis pour 'fouille'

    for (let i = 1; i <= 3; i++) {
      let res: boolean | undefined;
      act(() => {
        res = result.current.utiliserActive("fouille");
      });
      expect(res).toBe(true);
      expect(result.current.state!.activesUtilisees!.fouille!.usages).toBe(i);
    }

    let quatrieme: boolean | undefined;
    act(() => {
      quatrieme = result.current.utiliserActive("fouille");
    });
    expect(quatrieme).toBe(false);
    expect(result.current.state!.activesUtilisees!.fouille!.usages).toBe(3);
  });

  it("refus — 'diplomate' sans la compétence Négociation palier 3, même à haut niveau", async () => {
    const result = await setupNouvellePartie();
    atteindreNiveau(result, 20);
    expect(
      result.current.state!.competencesDebloquees.includes("general.negociation.3"),
    ).toBe(false);

    let res: boolean | undefined;
    act(() => {
      res = result.current.utiliserActive("diplomate");
    });

    expect(res).toBe(false);
    expect(result.current.state!.activesUtilisees?.diplomate).toBeUndefined();
  });
});
