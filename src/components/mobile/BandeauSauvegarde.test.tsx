// @vitest-environment jsdom
/**
 * Tâche 8 : le toast unique de 2,5 s (`saveEnEchecRef`) laissait le joueur
 * jouer une heure entière sur un échec de sauvegarde sans plus aucun signal.
 * Le bandeau ne s'efface jamais tant que l'échec persiste ; la modale
 * escalade au bout de deux minutes, puis revient rappeler toutes les cinq
 * minutes si le joueur l'a fermée sans que l'échec se résolve.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  GameStateContext,
  type EtatSauvegarde,
} from "@/context/GameContext";
import { BandeauSauvegarde, DELAI_MODALE_MS, RAPPEL_MODALE_MS } from "./BandeauSauvegarde";

// `estRoutePartie` est vraie par défaut ; un test la passe à faux.
const pathname = { valeur: "/bureau" };
vi.mock("next/navigation", () => ({ usePathname: () => pathname.valeur }));

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    d: {
      raisons: {
        sauvegardeBandeau: "Sauvegarde impossible — ta progression n'est pas enregistrée.",
        sauvegardeModaleTitre: "Ta progression n'est pas sauvegardée",
        sauvegardeModaleDepuisUn: "Depuis 1 minute.",
        sauvegardeModaleDepuisN: "Depuis {minutes} minutes.",
        sauvegardeModaleDisquePlein:
          "Le stockage de ton téléphone est plein. Libère de la place pour que ta partie soit enregistrée.",
        sauvegardeModaleIo:
          "Le stockage n'est pas disponible en ce moment. Ta partie n'est pas enregistrée.",
        sauvegardeModaleBouton: "J'ai compris",
      },
    },
  }),
}));

function rendreAvecEtat(etatSauvegarde: EtatSauvegarde) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <GameStateContext.Provider value={{ state: null, isHydrated: true, etatSauvegarde }}>
        {children}
      </GameStateContext.Provider>
    );
  }
  return render(<BandeauSauvegarde />, { wrapper: Wrapper });
}

describe("BandeauSauvegarde", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathname.valeur = "/bureau";
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("n'affiche rien tant que la sauvegarde passe", () => {
    rendreAvecEtat({ enEchec: false });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("affiche le bandeau dès le premier échec", () => {
    rendreAvecEtat({ enEchec: true, genre: "disque_plein", depuis: Date.now() });
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("le bandeau ne s'efface pas tout seul — c'est tout le point", () => {
    rendreAvecEtat({ enEchec: true, genre: "io", depuis: Date.now() });
    act(() => void vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("n'ouvre la modale qu'au bout de deux minutes", () => {
    rendreAvecEtat({ enEchec: true, genre: "io", depuis: Date.now() });
    act(() => void vi.advanceTimersByTime(119_000));
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => void vi.advanceTimersByTime(2_000));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("revient cinq minutes après avoir été fermée", () => {
    rendreAvecEtat({ enEchec: true, genre: "io", depuis: Date.now() });
    act(() => void vi.advanceTimersByTime(DELAI_MODALE_MS));
    act(() => void screen.getByRole("button", { name: /compris/i }).click());
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => void vi.advanceTimersByTime(RAPPEL_MODALE_MS));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("dit de libérer de la place quand le disque est plein", () => {
    rendreAvecEtat({ enEchec: true, genre: "disque_plein", depuis: Date.now() });
    act(() => void vi.advanceTimersByTime(DELAI_MODALE_MS));
    expect(screen.getByRole("dialog").textContent).toMatch(/place/i);
  });

  it("ne s'affiche pas hors d'une route de partie", () => {
    pathname.valeur = "/";
    rendreAvecEtat({ enEchec: true, genre: "io", depuis: Date.now() });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
