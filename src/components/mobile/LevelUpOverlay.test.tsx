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

// Plafond fictif simple (10) pour isoler le test de la vraie valeur (96) ;
// on garde le reste du module réel (deblocagesNiveau.ts en dépend).
vi.mock("@/data/competences", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/competences")>();
  return {
    ...actual,
    COUT_TOTAL_COMPETENCES: 10,
    pointsDepensesCompetences: (ids: readonly string[]) => ids.length,
  };
});

function etat(
  niveauVu: number,
  niveau: number,
  pointsDisponibles = 0,
  competencesDebloquees: string[] = [],
) {
  return {
    niveauVu,
    brocanteur: { niveau, xp: 0, pointsDisponibles },
    competencesDebloquees,
  };
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
    // deblocagesPourNiveau(1) = "Ouverture de l'écran Compétences (+1 point)" (famille jalon)
    expect(screen.getByText(/Ouverture de l'écran Compétences/)).toBeTruthy();
    // prochainDeblocage(1) = niveau 2, "L'Atelier vous tend les bras"
    expect(
      screen.getByText(/Prochain — Niv\. 3 : Quêtes quotidiennes et hebdomadaires/),
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

  it("sous le plafond de compétences : « +1 point » affiché", () => {
    // Plafond mocké à 10 ; 3 dispo + 4 dépensés = 7 < 10.
    mockState = etat(0, 1, 3, ["a", "b", "c", "d"]);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.getByText(/point de compétence/)).toBeTruthy();
  });

  it("plafond de compétences atteint : « +1 point » masqué", () => {
    // Plafond mocké à 10 ; 6 dispo + 4 dépensés = 10 >= 10.
    mockState = etat(0, 1, 6, ["a", "b", "c", "d"]);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.queryByText(/point de compétence/)).toBeNull();
  });

  it("atout débloqué (N5, Le Flair) : bloc grand format avec emoji géant et description", () => {
    mockState = etat(4, 5);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    // Titre sans l'emoji inline (l'emoji est extrait dans son propre bloc).
    expect(screen.getByText("Atout Le Flair")).toBeTruthy();
    expect(screen.getByText(/révèle la cote de tous les objets/)).toBeTruthy();
    const bloc = screen.getByText("Atout Le Flair").closest("[data-testid='levelup-atout']");
    expect(bloc).toBeTruthy();
    expect(bloc!.textContent).toContain("🔍");
  });

  it("niveau sans atout (N1) : ligne simple, pas de bloc atout ni pill de famille", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.getByText(/Ouverture de l'écran Compétences/)).toBeTruthy();
    expect(screen.queryByTestId("levelup-atout")).toBeNull();
    // La pill de famille a disparu.
    expect(screen.queryByText("Jalon")).toBeNull();
  });

  it("titre détaché de la carte : bloc .broc-levelup-titre sans bouton, carte .broc-levelup-carte avec bouton", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    const blocTitre = screen.getByText("Niveau 1 !").closest(".broc-levelup-titre");
    expect(blocTitre).toBeTruthy();
    expect(blocTitre!.querySelector("button")).toBeNull();
    const bouton = screen.getByRole("button", { name: "Continuer" });
    expect(bouton.closest(".broc-levelup-carte")).toBeTruthy();
  });
});
