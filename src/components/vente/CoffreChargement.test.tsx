// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CoffreChargement } from "./CoffreChargement";

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
});
