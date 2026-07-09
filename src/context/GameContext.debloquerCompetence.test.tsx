// @vitest-environment jsdom
/**
 * Régression ciblée sur `debloquerCompetence` (commit a143b9e) : la dépense
 * se fait désormais sur le pool global `brocanteur.pointsDisponibles`, avec un
 * re-check atomique (déjà débloquée + assez de points) DANS l'updater de
 * `setState`. Ce type de logique (crédit/dépense atomique dans un updater) a
 * déjà causé des bugs de double-dépense dans ce projet — d'où ce test dédié,
 * qui exerce le vrai `GameProvider` (aucun mock de la logique testée).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { xpRequisPourNiveauBrocanteur } from "@/lib/xp";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { localeCourante } from "@/lib/i18n/locales";
import type { CompetenceId } from "@/types/game";

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

// Palier 1, thématique — coût 1 point, aucune autre condition (niveau
// Brocanteur requis 0).
const PALIER_1: CompetenceId = "cat.Musique.reparer.1";

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
 * Crédite exactement `points` points de compétence globaux, en calculant l'XP
 * nécessaire pour franchir `points` niveaux de plus depuis l'état courant (le
 * seuil cumulé croît avec le niveau — un gain fixe de 100 ne suffit qu'au tout
 * premier niveau, cf. `xpRequisPourNiveauBrocanteur`).
 */
function crediterPoints(
  result: ReturnType<typeof renderHook<ReturnType<typeof useGame>, unknown>>["result"],
  points: number,
) {
  const brocanteur = result.current.state!.brocanteur;
  const seuilCible = xpRequisPourNiveauBrocanteur(brocanteur.niveau + points);
  const gain = seuilCible - brocanteur.xp;
  act(() => {
    result.current.gagnerXPBrocanteur(gain);
  });
}

describe("GameContext.debloquerCompetence — régression pool global", () => {
  it("succès : débloque un palier 1, décrémente le pool et ajoute l'id", async () => {
    const result = await setupNouvellePartie();
    crediterPoints(result, 1);
    expect(result.current.state!.brocanteur.pointsDisponibles).toBe(1);

    let res: { ok: boolean; raison?: string } | undefined;
    act(() => {
      res = result.current.debloquerCompetence(PALIER_1);
    });

    expect(res).toEqual({ ok: true });
    expect(result.current.state!.brocanteur.pointsDisponibles).toBe(0);
    expect(result.current.state!.competencesDebloquees).toEqual([PALIER_1]);
  });

  it("refus — pas assez de points : pool à 0, état inchangé", async () => {
    const result = await setupNouvellePartie();
    expect(result.current.state!.brocanteur.pointsDisponibles).toBe(0);

    let res: { ok: boolean; raison?: string } | undefined;
    act(() => {
      res = result.current.debloquerCompetence(PALIER_1);
    });

    expect(res?.ok).toBe(false);
    expect(res?.raison).toBeTruthy();
    expect(result.current.state!.brocanteur.pointsDisponibles).toBe(0);
    expect(result.current.state!.competencesDebloquees).toEqual([]);
  });

  it("refus — déjà débloquée : le 2e appel échoue et ne redécrémente pas", async () => {
    const result = await setupNouvellePartie();
    crediterPoints(result, 2);

    act(() => {
      result.current.debloquerCompetence(PALIER_1);
    });
    expect(result.current.state!.brocanteur.pointsDisponibles).toBe(1);

    let res: { ok: boolean; raison?: string } | undefined;
    act(() => {
      res = result.current.debloquerCompetence(PALIER_1);
    });

    // La raison passe désormais par le dictionnaire (SP4 i18n) : on assied
    // l'assertion sur la valeur localisée du dico, pas sur un littéral FR.
    expect(res).toEqual({
      ok: false,
      raison: DICTIONNAIRES[localeCourante()].raisons.dejaDebloquee,
    });
    // Pas de nouvelle décrémentation : le point restant du crédit précédent
    // (2 crédités, 1 dépensé) est toujours là.
    expect(result.current.state!.brocanteur.pointsDisponibles).toBe(1);
    expect(result.current.state!.competencesDebloquees).toEqual([PALIER_1]);
  });

  it("atomicité : deux appels dans le même tick ne dépensent qu'une fois", async () => {
    const result = await setupNouvellePartie();
    crediterPoints(result, 1);
    expect(result.current.state!.brocanteur.pointsDisponibles).toBe(1);

    // Les deux appels sont émis dans le même act() (même batch React), avant
    // tout re-rendu — c'est la course que corrige le re-check atomique DANS
    // l'updater de setState (cf. commit a143b9e).
    act(() => {
      result.current.debloquerCompetence(PALIER_1);
      result.current.debloquerCompetence(PALIER_1);
    });

    expect(result.current.state!.brocanteur.pointsDisponibles).toBe(0);
    expect(
      result.current.state!.competencesDebloquees.filter((id) => id === PALIER_1),
    ).toHaveLength(1);
  });
});
