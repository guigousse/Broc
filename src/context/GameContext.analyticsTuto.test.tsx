// @vitest-environment jsdom
/**
 * Instrumentation du décrochage : chaque avancement de tutoriel et chaque
 * mini-tuto terminé doit émettre exactement un événement analytics. C'est
 * la mesure la plus utile de tout ce chantier — elle répond à « combien de
 * joueurs finissent le tutoriel, et à quelle étape partent les autres ? ».
 *
 * L'appel `logEvenement` doit toujours suivre la mise à jour d'état, jamais
 * vivre dans le corps d'un updater `setState` : React 19 en StrictMode
 * invoque les updaters deux fois, ce qui doublerait chaque événement et
 * fausserait l'entonnoir. Le test « malgré StrictMode » ci-dessous monte le
 * provider sous <StrictMode> pour de vrai, afin que ce piège soit
 * réellement détecté et pas seulement documenté.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { cleSlot } from "@/lib/storage/slots";
import type { GameState } from "@/types/game";
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

const noms = () => stub.appels.map((a) => a.nom);

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

function wrapperStrict({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <GameProvider>{children}</GameProvider>
    </StrictMode>
  );
}

async function setupNouvellePartie(w: typeof wrapper = wrapper) {
  const { result } = renderHook(() => useGame(), { wrapper: w });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  return result;
}

/** Monte le provider et attend qu'il ait hydraté une save déjà présente en
 *  storage (slot 1 actif par défaut) — sans appeler `nouvellePartie`, qui
 *  écraserait la save seedée à la main. */
async function setupPartieExistante() {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  await waitFor(() => expect(result.current.state).not.toBeNull());
  return result;
}

/**
 * Fait naître une partie, attend l'auto-save (débouncée, 400 ms) pour
 * obtenir une save valide dans le slot 1, puis la réécrit avec les
 * mini-tutos vinyle et carnet en attente — impossible à atteindre par le
 * flux normal en test sans rejouer tout un anniversaire ou une ouverture de
 * carnet de commandes.
 */
async function seedMiniTutosEnAttente(): Promise<void> {
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
  save.miniTutoVinyle = "ecouter";
  save.miniTutoCarnet = "ouvrir";
  window.localStorage.setItem(cleSlot(1), JSON.stringify(save));
  unmount();
}

describe("instrumentation du tutoriel", () => {
  it("chaque avancement d'étape émet tuto_etape avec l'étape visée", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.avancerTutoriel("aller-chiner");
    });
    expect(stub.appels.filter((a) => a.nom === EVENEMENTS.tutoEtape)).toHaveLength(1);
    expect(stub.appels[0].params.etape).toBe("aller-chiner");
  });

  it("émet tuto_etape une seule fois par avancement, malgré StrictMode", async () => {
    const result = await setupNouvellePartie(wrapperStrict);
    act(() => {
      result.current.avancerTutoriel("aller-chiner");
    });
    expect(noms().filter((n) => n === EVENEMENTS.tutoEtape)).toHaveLength(1);
  });

  it("terminerTutoriel émet tuto_termine", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.terminerTutoriel();
    });
    expect(noms()).toContain(EVENEMENTS.tutoTermine);
  });

  // NB : terminerMiniTutoAtelier n'existe pas encore sur cette branche (livré
  // sur feat/tuto-corrections, non fusionnée dans feat/firebase-analytics).
  // Seuls les mini-tutos vinyle et carnet, déjà présents ici, sont couverts ;
  // l'instrumentation de l'atelier suivra à la fusion de cette branche.
  it("chaque mini-tuto terminé émet mini_tuto_termine avec son identifiant", async () => {
    await seedMiniTutosEnAttente();
    const result = await setupPartieExistante();
    act(() => {
      result.current.terminerMiniTutoVinyle();
    });
    act(() => {
      result.current.terminerMiniTutoCarnet();
    });
    expect(
      stub.appels.filter((a) => a.nom === EVENEMENTS.miniTutoTermine).map((a) => a.params.lequel),
    ).toEqual(["vinyle", "carnet"]);
  });

  // Régression : les updaters de GameContext se gardent déjà eux-mêmes
  // (idempotents), mais plusieurs call sites appellent ces actions sans
  // re-vérifier l'état avant (double tap, `onFini` rejoué…). Sans un vrai
  // calcul de transition, un rappel no-op émettrait quand même l'événement —
  // l'entonnoir de décrochage n'a de valeur que si chaque événement
  // correspond à un franchissement d'étape réel.
  it("un second avancerTutoriel vers une étape déjà atteinte n'émet rien de plus", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.avancerTutoriel("aller-chiner");
    });
    act(() => {
      // Rappel no-op : "aller-chiner" est déjà l'étape courante.
      result.current.avancerTutoriel("aller-chiner");
    });
    expect(noms().filter((n) => n === EVENEMENTS.tutoEtape)).toHaveLength(1);
  });

  it("un second terminerMiniTutoVinyle sur un mini-tuto déjà clos n'émet rien de plus", async () => {
    await seedMiniTutosEnAttente();
    const result = await setupPartieExistante();
    act(() => {
      result.current.terminerMiniTutoVinyle();
    });
    act(() => {
      // Rappel no-op : le mini-tuto est déjà "termine".
      result.current.terminerMiniTutoVinyle();
    });
    expect(
      stub.appels.filter(
        (a) => a.nom === EVENEMENTS.miniTutoTermine && a.params.lequel === "vinyle",
      ),
    ).toHaveLength(1);
  });
});
