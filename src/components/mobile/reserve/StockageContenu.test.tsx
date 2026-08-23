// @vitest-environment jsdom
/**
 * Garde de CÂBLAGE du cadenas de l'Atelier.
 *
 * `ReserveTabs` reçoit `atelierOuvert` déjà calculé : il ne peut pas prouver
 * d'où vient ce booléen, et un `true` en dur y passerait inaperçu. Le
 * prédicat lui-même est couvert ailleurs (competences.test.ts) — ce qui est
 * vérifié ici, c'est que la Réserve l'interroge vraiment : on monte le vrai
 * `StockageContenu` sur deux états de jeu qui ne diffèrent QUE par la
 * première compétence Réparer, et on lit le cadenas sur l'onglet Atelier.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StockageContenu } from "./StockageContenu";
import { __resetMemoireReserve } from "./ReserveShell";
import { catTreeId } from "@/data/competences";
import { CATEGORIES } from "@/data/categories";
import type { GameState } from "@/types/game";

let mockState: GameState;

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    state: mockState,
    isHydrated: true,
    donnerACollection: vi.fn(),
    ameliorerStockage: vi.fn(),
  }),
  useGameActions: () => ({
    avancerTutoriel: vi.fn(),
    tempsConfiance: () => null,
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
    niveauStockage: 1,
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

describe("StockageContenu — d'où vient l'ouverture de l'Atelier", () => {
  it("sans compétence Réparer, l'onglet Atelier est cadenassé", () => {
    mockState = etat([]);
    render(<StockageContenu />);
    expect(ongletAtelier().getAttribute("aria-disabled")).toBe("true");
  });

  it("la première compétence Réparer l'ouvre", () => {
    mockState = etat([`${catTreeId(CATEGORIES[0])}.reparer.1`]);
    render(<StockageContenu />);
    expect(ongletAtelier().getAttribute("aria-disabled")).toBe(null);
  });
});
