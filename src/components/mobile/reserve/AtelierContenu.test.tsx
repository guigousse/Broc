// @vitest-environment jsdom
/**
 * Garde de CÂBLAGE du cadenas, côté Atelier — le pendant exact de
 * StockageContenu.test.tsx.
 *
 * Les deux contenus de la Réserve montent la même bande d'onglets ; si un
 * seul des deux interrogeait vraiment `useVerrouReserve`, l'autre pourrait
 * afficher un cadenas (ou un badge) qui ne dit pas la même chose, et rien ne
 * le verrait. On monte donc le vrai `AtelierContenu` sur deux états de jeu
 * qui ne diffèrent QUE par la première compétence Réparer.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AtelierContenu } from "./AtelierContenu";
import { __resetMemoireReserve } from "./ReserveShell";
import { catTreeId } from "@/data/competences";
import { CATEGORIES } from "@/data/categories";
import type { GameState } from "@/types/game";

let mockState: GameState;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/context/GameContext", () => ({
  useGameStateOnly: () => ({ state: mockState, isHydrated: true }),
  useGameActions: () => ({ tempsConfiance: () => null }),
  useGame: () => ({
    state: mockState,
    isHydrated: true,
    restaurerObjet: vi.fn(),
    terminerRestaurationImmediate: vi.fn(),
    tempsConfiance: () => null,
    ameliorerAtelier: vi.fn(),
    demantelerObjet: vi.fn(),
    recupererObjetRestaure: vi.fn(),
    terminerMiniTutoAtelier: vi.fn(),
  }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  __resetMemoireReserve();
});

function etat(competences: string[]): GameState {
  return {
    brocanteur: { niveau: 1, xp: 0, pointsDisponibles: 0 },
    inventaireJoueur: [],
    competencesDebloquees: competences,
    piecesAmelioration: {},
    niveauAtelier: 1,
    budget: 0,
    tutorielEtape: "termine",
  } as unknown as GameState;
}

/** Le bouton de l'onglet Atelier de la bande haute. */
function ongletAtelier(): HTMLElement {
  const btn = screen
    .getAllByRole("button")
    .find((b) => b.getAttribute("data-tuto-coach") === "reserve-onglet-atelier");
  if (!btn) throw new Error("onglet Atelier introuvable");
  return btn;
}

describe("AtelierContenu — d'où vient l'ouverture de l'Atelier", () => {
  it("sans compétence Réparer, l'onglet Atelier est cadenassé", () => {
    mockState = etat([]);
    render(<AtelierContenu />);
    expect(ongletAtelier().getAttribute("aria-disabled")).toBe("true");
  });

  it("la première compétence Réparer l'ouvre", () => {
    mockState = etat([`${catTreeId(CATEGORIES[0])}.reparer.1`]);
    render(<AtelierContenu />);
    expect(ongletAtelier().getAttribute("aria-disabled")).toBe(null);
  });
});
