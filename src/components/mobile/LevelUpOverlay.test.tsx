// @vitest-environment jsdom
/**
 * `LevelUpOverlay` — écran de level-up global (plan 4/4, Task 4).
 * Pur lecteur de `useGame()` + 1 action (`marquerNiveauVu`) : on mocke le
 * contexte, `next/navigation` et `audioManager` (pas besoin du vrai provider).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LevelUpOverlay } from "./LevelUpOverlay";

afterEach(cleanup);

let mockState: Record<string, unknown> | null = null;
const marquerNiveauVu = vi.fn();
let mockPathname = "/bureau";

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({ state: mockState, marquerNiveauVu }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

const playLevelUp = vi.fn();
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: { playLevelUp: (...args: unknown[]) => playLevelUp(...args) },
}));

function etat(niveauVu: number, niveau: number) {
  return { niveauVu, brocanteur: { niveau, xp: 0, pointsDisponibles: 0 } };
}

describe("LevelUpOverlay", () => {
  it("rien à célébrer : ne rend rien", () => {
    mockState = etat(2, 2);
    mockPathname = "/bureau";
    const { container } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("niveau en attente : titre « Niveau 1 », déblocages du niveau, preview du prochain", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.getByText("Niveau 1 !")).toBeTruthy();
    // deblocagesPourNiveau(1) = "Premier point de compétence" (famille jalon)
    expect(screen.getByText(/Premier point de compétence/)).toBeTruthy();
    // prochainDeblocage(1) = niveau 2, "L'Atelier vous tend les bras"
    expect(
      screen.getByText(/Prochain — Niv\. 2 : L'Atelier vous tend les bras/),
    ).toBeTruthy();
  });

  it("Continuer appelle marquerNiveauVu et joue le son une fois par niveau", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    playLevelUp.mockClear();
    marquerNiveauVu.mockClear();
    render(<LevelUpOverlay />);
    expect(playLevelUp).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(marquerNiveauVu).toHaveBeenCalledTimes(1);
  });

  it("retenu pendant une session : pathname /chiner/xxx → null même avec un niveau en attente", () => {
    mockState = etat(0, 1);
    mockPathname = "/chiner/xxx";
    const { container } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("multi-niveaux : célèbre niveauVu+1, pas le niveau final", () => {
    mockState = etat(3, 5);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.getByText("Niveau 4 !")).toBeTruthy();
    expect(screen.queryByText("Niveau 5 !")).toBeNull();
  });
});
