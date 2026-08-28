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
import {
  act,
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { AtelierContenu } from "./AtelierContenu";
import { __resetMemoireReserve } from "./ReserveShell";
import { catTreeId } from "@/data/competences";
import { CATEGORIES } from "@/data/categories";
import type { GameState } from "@/types/game";

let mockState: GameState;

const { accelererMock, showRewardedAd } = vi.hoisted(() => ({
  accelererMock: vi.fn(() => ({ ok: true }) as { ok: boolean; raison?: string }),
  showRewardedAd: vi.fn(async () => ({ rewarded: true })),
}));

vi.mock("@/lib/ads/adProvider", () => ({
  getAdProvider: () => ({ showRewardedAd }),
  EMPLACEMENTS_PUB: { restauration: "restauration" },
}));

const { recupererMock } = vi.hoisted(() => ({
  recupererMock: vi.fn(() => ({ ok: true }) as { ok: boolean; raison?: string }),
}));

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
    terminerRestaurationImmediate: accelererMock,
    tempsConfiance: () => null,
    ameliorerAtelier: vi.fn(),
    demantelerObjet: vi.fn(),
    recupererObjetRestaure: recupererMock,
    terminerMiniTutoAtelier: vi.fn(),
  }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  __resetMemoireReserve();
  recupererMock.mockClear();
  accelererMock.mockClear();
  showRewardedAd.mockClear();
  recupererMock.mockReturnValue({ ok: true });
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

describe("AtelierContenu — récupérer un objet restauré", () => {
  /** État avec un établi dont la restauration est échue. */
  function etatAvecObjetPret(): GameState {
    const s = etat([`${catTreeId(CATEGORIES[0])}.reparer.1`]);
    return {
      ...s,
      inventaireJoueur: [
        {
          id: "o1",
          templateId: "lampe-tiffany",
          categorie: "Maison",
          etat: "Bon",
          rarete: "commun",
          enRestauration: { etatCible: "Très bon", debutMs: 0, finMs: 1 },
        },
      ],
    } as unknown as GameState;
  }

  function cliquerRecuperer() {
    // La pastille « Récupérer » est une étiquette posée SUR le carré ; c'est
    // le carré qui porte le geste.
    expect(screen.getByTestId("pastille-recuperer")).toBeTruthy();
    fireEvent.click(
      document.querySelector('[data-etabli-id="o1"]') as HTMLElement,
    );
  }

  it("crédite la partie une seule fois, puis joue la cérémonie", () => {
    mockState = etatAvecObjetPret();
    render(<AtelierContenu />);
    cliquerRecuperer();
    expect(recupererMock).toHaveBeenCalledTimes(1);
    expect(recupererMock).toHaveBeenCalledWith("o1");
    expect(screen.getByTestId("celebration-restauration")).toBeTruthy();
  });

  it("la cérémonie survit aux ticks d'horloge de l'écran et se referme", () => {
    // L'écran se re-rend CHAQUE SECONDE pour rafraîchir les décomptes des
    // établis. Si la séquence de la cérémonie repart à chaque re-rendu, elle
    // ne parvient jamais à son vol : elle rejoue en boucle (bug 2026-08-28).
    vi.useFakeTimers();
    try {
      mockState = etatAvecObjetPret();
      render(<AtelierContenu />);
      cliquerRecuperer();
      // Sans cette garde, l'attente ci-dessous passerait aussi pour une
      // cérémonie qui n'a JAMAIS été montée (test creux).
      expect(screen.getByTestId("celebration-restauration")).toBeTruthy();
      // EN TRANCHES : un seul `advanceTimersByTime(4000)` groupe tous les
      // re-rendus à la fin de l'act et le tick d'horloge ne tombe jamais au
      // milieu de la séquence — c'est précisément le cas qui casse.
      for (let t = 0; t < 50; t++) {
        act(() => {
          vi.advanceTimersByTime(100);
        });
      }
      expect(screen.queryByTestId("celebration-restauration")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("récupération refusée : aucune cérémonie", () => {
    mockState = etatAvecObjetPret();
    recupererMock.mockReturnValue({ ok: false, raison: "pas fini" });
    render(<AtelierContenu />);
    cliquerRecuperer();
    expect(screen.queryByTestId("celebration-restauration")).toBeNull();
  });
});

describe("AtelierContenu — accélérer par la pub", () => {
  /** Établi dont il reste 10 minutes : dans la fenêtre d'accélération. */
  function etatAvecObjetPresque(): GameState {
    const s = etat([`${catTreeId(CATEGORIES[0])}.reparer.1`]);
    return {
      ...s,
      inventaireJoueur: [
        {
          id: "o1",
          templateId: "lampe-tiffany",
          categorie: "Maison",
          etat: "Bon",
          rarete: "commun",
          enRestauration: {
            etatCible: "Très bon",
            debutMs: Date.now() - 60_000,
            finMs: Date.now() + 10 * 60_000,
          },
        },
      ],
    } as unknown as GameState;
  }

  it("la pastille du slot lance la pub, qui rend l'établi prêt SANS cérémonie", async () => {
    mockState = etatAvecObjetPresque();
    render(<AtelierContenu />);
    fireEvent.click(screen.getByTestId("pastille-pub"));
    await waitFor(() => expect(accelererMock).toHaveBeenCalledWith("o1"));
    // La cérémonie appartient au tap sur « Récupérer », pas à la pub.
    expect(screen.queryByTestId("celebration-restauration")).toBeNull();
    expect(recupererMock).not.toHaveBeenCalled();
  });

  it("pub refusée (non regardée jusqu'au bout) : rien ne bouge", async () => {
    showRewardedAd.mockResolvedValueOnce({ rewarded: false });
    mockState = etatAvecObjetPresque();
    render(<AtelierContenu />);
    fireEvent.click(screen.getByTestId("pastille-pub"));
    await waitFor(() => expect(showRewardedAd).toHaveBeenCalled());
    expect(accelererMock).not.toHaveBeenCalled();
  });
});
