// @vitest-environment jsdom
/**
 * `TabBar` — onboarding (plan 4/4, Task 7) : l'onglet Bibliothèque ne se
 * révèle qu'au niveau 1 (première ouverture de l'écran Compétences).
 * On mocke `useGameStateOnly`/`useGameActions` (TabBar ne consomme pas
 * `useGame`) et `next/navigation`, comme LevelUpOverlay.test.tsx.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TabBar } from "./TabBar";
import type { GameState } from "@/types/game";

afterEach(cleanup);

let mockPathname = "/bureau";
let mockGameStateValue: { state: GameState | null; isHydrated: boolean } = {
  state: null,
  isHydrated: false,
};

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
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
});
