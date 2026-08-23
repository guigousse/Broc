// @vitest-environment jsdom
/**
 * Revue de la Tâche 8 (finding 3) : la branche « changement de genre en
 * cours d'échec » de `doSave` — `{ ...prec, genre: res.genre }` — n'avait
 * AUCUNE couverture. La réécrire en `{ enEchec: true, genre: res.genre,
 * depuis: Date.now() }` (repartir de zéro à CHAQUE échec, même un simple
 * changement de genre pour le même incident) laisse toute la suite verte
 * tout en recassant la fonctionnalité : c'est exactement l'invariant que
 * la spec de la Tâche 8 nomme — « depuis est posé au PREMIER échec et ne
 * bouge plus ». Ce test exerce le VRAI `GameProvider` (pas un état
 * bricolé passé à la main à `BandeauSauvegarde`) : deux échecs de genres
 * différents pour le même incident, séparés dans le temps, puis vérifie
 * que la modale de `BandeauSauvegarde` s'ouvre au moment dicté par le
 * PREMIER échec — pas relancée par le second.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import {
  BandeauSauvegarde,
  DELAI_MODALE_MS,
} from "@/components/mobile/BandeauSauvegarde";

const pathname = { valeur: "/bureau" };
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => pathname.valeur,
}));

vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

const setItemOriginal = Storage.prototype.setItem;

/** Erreur dont le `.name` fait basculer `genreDeLErreur` sur "disque_plein". */
function erreurDisquePlein(): Error {
  const e = new Error("Quota dépassé (simulé)");
  e.name = "QuotaExceededError";
  return e;
}

/** Toute autre erreur retombe sur le genre "io". */
function erreurIo(): Error {
  return new Error("Panne de stockage (simulée)");
}

type ProbeCourant = ReturnType<typeof useGame> | null;

function Harness({ probe }: { probe: { current: ProbeCourant } }) {
  const game = useGame();
  probe.current = game;
  return <BandeauSauvegarde />;
}

function monter() {
  const probe: { current: ProbeCourant } = { current: null };
  render(
    <GameProvider>
      <Harness probe={probe} />
    </GameProvider>,
  );
  return probe;
}

beforeEach(() => {
  vi.useFakeTimers();
  pathname.valeur = "/bureau";
  // L'échec de save passe par console.warn (localGameRepository) : silence.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  Storage.prototype.setItem = setItemOriginal;
  vi.restoreAllMocks();
  cleanup();
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("GameContext + BandeauSauvegarde — le genre peut changer, `depuis` non (finding 3)", () => {
  it("un changement de genre en cours d'échec ne relance pas le délai de la modale", async () => {
    const probe = monter();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(probe.current!.isHydrated).toBe(true);

    act(() => {
      probe.current!.nouvellePartie();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(probe.current!.state).not.toBeNull();

    // Premier échec (genre "io") — pose `depuis`.
    Storage.prototype.setItem = () => {
      throw erreurIo();
    };
    await act(async () => {
      window.dispatchEvent(new Event("pagehide"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(probe.current!.etatSauvegarde).toMatchObject({
      enEchec: true,
      genre: "io",
    });
    const depuisOriginal = (
      probe.current!.etatSauvegarde as { enEchec: true; depuis: number }
    ).depuis;

    // 110 s d'échec : sous le seuil de la modale (120 s) — encore rien.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(110_000);
    });
    expect(screen.queryByRole("dialog")).toBeNull();

    // Deuxième échec, genre DIFFÉRENT ("disque_plein"), même incident : ne
    // doit PAS reposer `depuis` à maintenant.
    Storage.prototype.setItem = () => {
      throw erreurDisquePlein();
    };
    await act(async () => {
      window.dispatchEvent(new Event("pagehide"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(probe.current!.etatSauvegarde).toMatchObject({
      enEchec: true,
      genre: "disque_plein",
      depuis: depuisOriginal,
    });

    // 20 s de plus : 130 s cumulées depuis le PREMIER échec, au-delà du
    // seuil de 120 s (`DELAI_MODALE_MS`) — la modale doit être ouverte. Si
    // `depuis` avait été reposé au deuxième échec, seules 20 s se seraient
    // écoulées depuis lui : bien en-deçà du seuil, la modale resterait
    // fermée — c'est exactement ce que ce test doit détecter.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(20_000).toBeLessThan(DELAI_MODALE_MS);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
