// @vitest-environment jsdom
/**
 * Couvre les deux garanties centrales du composant, jusque-là seulement dans
 * les commentaires :
 *   - le lecteur de contexte voit l'état COURANT (pas figé au montage) ;
 *   - il ne rend un contexte QUE si une partie est réellement chargée — pas
 *     seulement "on est sur une route de jeu" (revue : hydratation en cours
 *     ≠ jour 0 ; `state` peut être `null` sur une route de jeu tant que le
 *     chargement async de la save n'a pas résolu).
 * On monte le vrai `GameProvider` (comme GameContext.marquerNiveauVu.test.tsx
 * et ses voisins) plutôt que de mocker `useGame`, pour observer la fenêtre
 * réelle d'hydratation. Les assertions passent par `contexteCourant()`
 * (comportement observable), pas par les internes du composant.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { GameProvider, useGame } from "@/context/GameContext";
import { FirebaseBootstrap } from "./FirebaseBootstrap";
import { contexteCourant, definirLecteurContexte } from "@/lib/analytics/contexte";
import { reinitialiserAnalyticsPourTest, StubAnalyticsProvider } from "@/lib/analytics/analytics";

let mockPathname = "/bureau";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

// Évite le vrai appel réseau (HttpTimeSource) déclenché par l'effet d'ancrage
// temporel du provider — même motif que les autres tests de GameContext.
vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  definirLecteurContexte(null);
  reinitialiserAnalyticsPourTest();
  mockPathname = "/bureau";
});

/** Sonde : expose `useGame()` à côté de `FirebaseBootstrap`, pour piloter la
 *  partie (nouvellePartie/avancerJour) depuis les tests. */
function Sonde({ api }: { api: { current: ReturnType<typeof useGame> | null } }) {
  api.current = useGame();
  return <FirebaseBootstrap />;
}

function monter() {
  const api: { current: ReturnType<typeof useGame> | null } = { current: null };
  render(
    <GameProvider>
      <Sonde api={api} />
    </GameProvider>,
  );
  return api;
}

describe("FirebaseBootstrap — fenêtre d'hydratation", () => {
  it("pas encore hydraté, sur une route de jeu : contexte vide (pas de jour 0 fabriqué)", () => {
    mockPathname = "/bureau";
    reinitialiserAnalyticsPourTest(new StubAnalyticsProvider());
    monter();
    // Juste après le montage, avant toute résolution de la promesse de
    // chargement de la save : `isHydrated` est encore false et `state` encore
    // null. Le lecteur doit rendre "hors partie", pas un jour 0 inventé.
    expect(contexteCourant()).toEqual({});
  });

  it("hydraté, sur une route de jeu : contexte = jour/niveau de l'état réel", async () => {
    mockPathname = "/bureau";
    const api = monter();
    await waitFor(() => expect(api.current!.isHydrated).toBe(true));
    act(() => {
      api.current!.nouvellePartie();
    });
    await waitFor(() => expect(api.current!.state).not.toBeNull());

    await waitFor(() =>
      expect(contexteCourant()).toEqual({
        jour: api.current!.state!.jourActuel,
        jour_tranche: expect.any(String),
        niveau: api.current!.state!.brocanteur.niveau,
      }),
    );
  });

  it("hydraté, hors route de jeu : contexte vide même avec une partie chargée", async () => {
    mockPathname = "/privacy";
    const api = monter();
    await waitFor(() => expect(api.current!.isHydrated).toBe(true));
    act(() => {
      api.current!.nouvellePartie();
    });
    await waitFor(() => expect(api.current!.state).not.toBeNull());

    expect(contexteCourant()).toEqual({});
  });

  it("fraîcheur : après avancerJour, le lecteur rend le NOUVEAU jour sans remontage", async () => {
    mockPathname = "/bureau";
    const api = monter();
    await waitFor(() => expect(api.current!.isHydrated).toBe(true));
    act(() => {
      api.current!.nouvellePartie();
    });
    await waitFor(() => expect(api.current!.state).not.toBeNull());
    const jourInitial = api.current!.state!.jourActuel;

    act(() => {
      api.current!.avancerJour(3);
    });
    await waitFor(() => expect(api.current!.state!.jourActuel).toBe(jourInitial + 3));

    await waitFor(() =>
      expect((contexteCourant() as { jour: number }).jour).toBe(jourInitial + 3),
    );
  });
});

describe("FirebaseBootstrap — screen_view", () => {
  // Recette simulateur du 2026-08-21 : DebugView montrait
  // `firebase_screen_class = TaoUIViewController` sur TOUS les événements, y
  // compris `tuto_etape`. Cause : sans `screen_class` explicite, Firebase le
  // déduit du contrôleur natif courant, puis colle cet écran sur les
  // événements suivants. `FirebaseAutomaticScreenReportingEnabled: false`
  // n'empêche que l'ÉMISSION automatique de `screen_view`, pas cette
  // déduction — le drapeau visait le mauvais mécanisme.
  // Conséquence sans ce correctif : le rapport GA4 « Pages et écrans »,
  // ventilé par classe d'écran, fond tous les écrans en une seule ligne.
  it("déclare screen_class explicitement, sinon Firebase y met la classe du WebView", () => {
    mockPathname = "/bureau";
    const stub = new StubAnalyticsProvider();
    reinitialiserAnalyticsPourTest(stub);
    monter();

    const vu = stub.appels.find((a) => a.nom === "screen_view");
    expect(vu).toBeDefined();
    expect(vu!.params.screen_class).toBe(vu!.params.screen_name);
  });
});
