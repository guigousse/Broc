// @vitest-environment jsdom
/**
 * `useVerrouReserve` — la source unique du verrou et du badge de l'onglet
 * Atelier, que les DEUX contenus de la Réserve consomment.
 *
 * Ce qui est éprouvé ici, c'est la règle elle-même : d'où vient l'ouverture,
 * ce que compte le badge, et sur quelle horloge il le compte. Le fait que
 * chaque contenu tire bien de ce hook est établi ailleurs, par les deux
 * gardes de câblage symétriques (StockageContenu.test.tsx,
 * AtelierContenu.test.tsx).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { useVerrouReserve } from "./useVerrouReserve";
import { catTreeId } from "@/data/competences";
import { CATEGORIES } from "@/data/categories";
import type { GameState } from "@/types/game";

const REPARER = `${catTreeId(CATEGORIES[0])}.reparer.1`;

let mockState: GameState | null = null;
let mockTempsConfiance: () => number | null = () => null;

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));

vi.mock("@/context/GameContext", () => ({
  useGameStateOnly: () => ({ state: mockState, isHydrated: true }),
  useGameActions: () => ({ tempsConfiance: () => mockTempsConfiance() }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

afterEach(() => {
  cleanup();
  toastMock.mockClear();
  mockTempsConfiance = () => null;
});

/** Un objet en restauration se terminant à `finMs`. */
function enRestauration(finMs: number) {
  return {
    id: `o${finMs}`,
    categorie: CATEGORIES[0],
    enRestauration: { debutMs: finMs - 3_600_000, finMs },
  };
}

function etat(
  competences: string[],
  inventaire: ReturnType<typeof enRestauration>[] = [],
): GameState {
  return {
    brocanteur: { niveau: 1, xp: 0, pointsDisponibles: 0 },
    inventaireJoueur: inventaire,
    competencesDebloquees: competences,
  } as unknown as GameState;
}

describe("useVerrouReserve — l'ouverture de l'Atelier", () => {
  it("fermé tant qu'aucune compétence Réparer n'est acquise", () => {
    mockState = etat([]);
    expect(renderHook(() => useVerrouReserve()).result.current.atelierOuvert).toBe(false);
  });

  it("ouvert dès la première compétence Réparer", () => {
    mockState = etat([REPARER]);
    expect(renderHook(() => useVerrouReserve()).result.current.atelierOuvert).toBe(true);
  });

  it("fermé, et sans badge, avant l'hydratation de la partie", () => {
    mockState = null;
    const { result } = renderHook(() => useVerrouReserve());
    expect(result.current.atelierOuvert).toBe(false);
    expect(result.current.badgeAtelier).toBe(0);
  });
});

describe("useVerrouReserve — le badge des restaurations prêtes", () => {
  it("ne compte que les restaurations terminées", () => {
    mockTempsConfiance = () => 1_000_000;
    mockState = etat([REPARER], [
      enRestauration(999_999), // terminée
      enRestauration(1_000_000), // pile à l'heure : terminée
      enRestauration(1_000_001), // encore en cours
    ]);
    expect(renderHook(() => useVerrouReserve()).result.current.badgeAtelier).toBe(2);
  });

  it("compte sur le TEMPS DE CONFIANCE, pas sur l'horloge murale", () => {
    // Le cas décisif : l'horloge de l'appareil est en retard (ou a été
    // reculée). Une restauration déjà finie pour le jeu ne doit pas
    // redevenir « en cours » parce que `Date.now()` dit le contraire.
    const mural = Date.now();
    mockTempsConfiance = () => mural + 10 * 60 * 60 * 1000;
    mockState = etat([REPARER], [enRestauration(mural + 60_000)]);
    expect(renderHook(() => useVerrouReserve()).result.current.badgeAtelier).toBe(1);
  });

  it("se replie sur l'horloge murale tant que le temps de confiance n'est pas établi", () => {
    mockTempsConfiance = () => null;
    mockState = etat([REPARER], [
      enRestauration(Date.now() - 60_000),
      enRestauration(Date.now() + 60 * 60 * 1000),
    ]);
    expect(renderHook(() => useVerrouReserve()).result.current.badgeAtelier).toBe(1);
  });
});

describe("useVerrouReserve — le toast du cadenas", () => {
  it("dit ce qui ouvre l'Atelier, sur le ton d'une information", () => {
    mockState = etat([]);
    renderHook(() => useVerrouReserve()).result.current.onVerrou();
    expect(toastMock).toHaveBeenCalledWith(
      "L'Atelier ouvre avec ta première compétence Réparer.",
      { type: "info" },
    );
  });
});
