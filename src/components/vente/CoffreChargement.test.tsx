// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CoffreChargement } from "./CoffreChargement";
import { createMockObjetEnVitrine } from "@/lib/__test-fixtures__/gameState";

afterEach(cleanup);

beforeEach(() => {
  // jsdom ne décode pas les images : les masques du coffre et des objets
  // retombent sur leurs fallbacks, ce qui suffit à cette suite.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

function poser(over: Partial<Parameters<typeof CoffreChargement>[0]> = {}) {
  const props = {
    niveauCamion: 1 as const,
    budget: 500,
    stock: [],
    coffre: [],
    onAjouter: vi.fn(),
    onMove: vi.fn(),
    onRotate: vi.fn(),
    onRetirer: vi.fn(),
    onUpgrade: vi.fn(),
    onValider: vi.fn(),
    onAnnuler: vi.fn(),
    ...over,
  };
  render(<CoffreChargement {...props} />);
  return props;
}

describe("CoffreChargement — concession", () => {
  it("affiche le panneau du palier suivant au niveau 1", () => {
    poser();
    expect(screen.getByText("Concession")).toBeTruthy();
    expect(screen.getByText("Break")).toBeTruthy();
  });

  it("aucun panneau au niveau max", () => {
    poser({ niveauCamion: 3 });
    expect(screen.queryByText("Concession")).toBeNull();
  });

  it("aucun panneau pendant le tutoriel de préparation d'étal", () => {
    poser({ tuto: true });
    expect(screen.queryByText("Concession")).toBeNull();
  });

  it("le tap ouvre la fiche, l'achat appelle onUpgrade avec le palier suivant", () => {
    const props = poser();
    fireEvent.click(screen.getByText("Concession"));
    fireEvent.click(screen.getByRole("button", { name: "Acheter · 200 €" }));
    expect(props.onUpgrade).toHaveBeenCalledTimes(1);
    expect(props.onUpgrade).toHaveBeenCalledWith(2);
  });

  it("budget insuffisant : la fiche s'ouvre mais l'achat reste bloqué", () => {
    const props = poser({ budget: 40 });
    fireEvent.click(screen.getByText("Concession"));
    expect(screen.getByText("Il vous manque 160 €")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Acheter · 200 €" }));
    expect(props.onUpgrade).not.toHaveBeenCalled();
  });

  it("tap sur Valider (voiture qui part) : la pancarte ET la fiche disparaissent", () => {
    // Un objet centré, sans chevauchement (trunkMask reste null en jsdom →
    // computeOverlapsPixel retombe sur les bornes [0,1]), pour que
    // peutValider soit vrai et que « Valider » soit tapable.
    const coffre = [
      {
        ...createMockObjetEnVitrine({
          objet: { templateId: "mus.33tours_jazz_1", categorie: "Musique" },
        }),
        posX: 0.5,
        posY: 0.5,
      },
    ];
    try {
      vi.useFakeTimers();
      poser({ coffre });

      // Ouvre la pancarte, puis la fiche de concession.
      fireEvent.click(screen.getByText("Concession"));
      expect(screen.getByRole("dialog")).toBeTruthy();

      // Fiche ouverte : « Valider » reste tapable (barre d'actions au-dessus
      // du scrim/corps de la sheet) et déclenche le départ de la voiture.
      fireEvent.click(screen.getByRole("button", { name: "Valider le chargement" }));

      // La pancarte disparaît (panneauVisible retombe sur !closing) et la
      // fiche aussi (open dérivé de sheetOuverte && !closing).
      expect(screen.queryByText("Concession")).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();

      // Laisse l'animation de départ (sons + tween + rAF) aller à son terme
      // pour ne laisser aucun minuteur en suspens à la fin du test.
      act(() => {
        vi.advanceTimersByTime(6000);
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
