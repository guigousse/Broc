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
  useGameStateOnly: () => ({ state: mockState, isHydrated: true }),
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

function etat(competences: string[], extra: Record<string, unknown> = {}): GameState {
  return {
    brocanteur: { niveau: 1, xp: 0, pointsDisponibles: 0 },
    inventaireJoueur: [],
    competencesDebloquees: competences,
    piecesAmelioration: {},
    niveauStockage: 1,
    budget: 0,
    tutorielEtape: "termine",
    ...extra,
  } as unknown as GameState;
}

/** L'Atelier ouvert : condition de la visite guidée. */
const REPARER = [`${catTreeId(CATEGORIES[0])}.reparer.1`];

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

/**
 * Une seule main à la fois dans tout le jeu. `TabBar.mainMiniTuto` applique
 * une priorité stricte carnet > atelier > vinyle ; la bande haute de la
 * Réserve doit lire la même règle, sinon un joueur qui a les deux mini-tutos
 * armés voit DEUX doigts — l'un vers QUÊTES en bas, l'autre vers ATELIER en
 * haut.
 */
describe("StockageContenu — une seule main de guidage", () => {
  it("visite de l'Atelier armée seule : la main se pose sur l'onglet", () => {
    mockState = etat(REPARER, { miniTutoAtelier: "visite" });
    render(<StockageContenu />);
    expect(ongletAtelier().className).toContain("tuto-main");
  });

  it("mini-tuto du carnet en cours : la main de l'Atelier s'efface", () => {
    mockState = etat(REPARER, {
      miniTutoAtelier: "visite",
      miniTutoCarnet: "ouvrir",
    });
    render(<StockageContenu />);
    expect(document.querySelector(".tuto-main")).toBeNull();
  });

  it("carnet déjà clos : la main de l'Atelier revient", () => {
    mockState = etat(REPARER, {
      miniTutoAtelier: "visite",
      miniTutoCarnet: "termine",
    });
    render(<StockageContenu />);
    expect(ongletAtelier().className).toContain("tuto-main");
  });
});
