// @vitest-environment jsdom
/**
 * `TabBar` — onboarding (plan 4/4, Task 7) : l'onglet Bibliothèque ne se
 * révèle qu'au niveau 1 (première ouverture de l'écran Compétences).
 * On mocke `useGameStateOnly`/`useGameActions` (TabBar ne consomme pas
 * `useGame`) et `next/navigation`, comme LevelUpOverlay.test.tsx.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TabBar } from "./TabBar";
import type { GameState } from "@/types/game";

afterEach(() => {
  cleanup();
  pushMock.mockClear();
});

let mockPathname = "/bureau";
let mockGameStateValue: { state: GameState | null; isHydrated: boolean } = {
  state: null,
  isHydrated: false,
};

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/context/GameContext", () => ({
  useGameStateOnly: () => mockGameStateValue,
  useGameActions: () => ({ tempsConfiance: () => null }),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({ playClick: vi.fn() }),
}));

function etat(niveau: number): GameState {
  return {
    brocanteur: { niveau, xp: 0, pointsDisponibles: 0 },
    inventaireJoueur: [],
    tutorielEtape: "termine",
  } as unknown as GameState;
}

describe("TabBar — onboarding Bibliothèque", () => {
  it("l'onglet Biblio. est absent à niveau 0", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(0), isHydrated: true };
    render(<TabBar />);
    expect(screen.queryByText("Biblio.")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("l'onglet Biblio. est présent dès le niveau 1", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    expect(screen.getByText("Biblio.")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("state null (pré-hydratation) : les 5 onglets par défaut, pas de flash de disparition", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: null, isHydrated: true };
    render(<TabBar />);
    expect(screen.getByText("Biblio.")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("tutoriel en cours : la barre reste visible mais la navigation est inerte", () => {
    mockPathname = "/bureau";
    const state = { ...etat(1), tutorielEtape: "accueil" } as unknown as GameState;
    mockGameStateValue = { state, isHydrated: true };
    render(<TabBar />);
    expect(screen.getByRole("navigation")).toBeTruthy();
    const nonActif = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-current") === null);
    expect(nonActif).toBeTruthy();
    fireEvent.click(nonActif!);
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("TabBar — mini-tuto vinyle (main pointeuse)", () => {
  function etatMiniTuto(mt: "ajouter" | "ecouter"): GameState {
    return {
      brocanteur: { niveau: 1, xp: 0, pointsDisponibles: 0 },
      inventaireJoueur: [],
      tutorielEtape: "termine",
      miniTutoVinyle: mt,
    } as unknown as GameState;
  }

  it("nav en zIndex 40 + main sur Bureau quand ecouter hors /bureau", () => {
    mockPathname = "/stockage";
    mockGameStateValue = { state: etatMiniTuto("ecouter"), isHydrated: true };
    render(<TabBar />);
    const nav = screen.getByRole("navigation");
    expect(nav.style.zIndex).toBe("40");
    const bureau = screen.getAllByRole("button").find((b) => b.className.includes("tuto-main"));
    expect(bureau?.textContent).toContain("Bureau");
  });

  it("nav en zIndex 30 sans main (ecouter, déjà sur /bureau)", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etatMiniTuto("ecouter"), isHydrated: true };
    render(<TabBar />);
    expect(screen.getByRole("navigation").style.zIndex).toBe("30");
    expect(document.querySelector(".tuto-main")).toBeNull();
  });
});
