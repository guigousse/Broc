// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CollectionGridOverlay } from "./CollectionGridOverlay";
import type { GameState } from "@/types/game";

afterEach(cleanup);

const minimalState = {
  budget: 0,
  inventaireJoueur: [],
  niveauStockage: 1,
  collection: {
    Musique: [],
    "Jeux & Loisirs": [],
    "Livres & Papeterie": [],
    Mode: [],
    Maison: [],
    "Objets d'art": [],
    Bricolage: [],
  },
} as unknown as GameState;

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    state: minimalState,
    donnerACollection: vi.fn(),
    retirerDeCollection: vi.fn(),
    marquerVuDansCollection: vi.fn(),
  }),
}));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("CollectionGridOverlay", () => {
  it("ne rend rien quand fermé", () => {
    const { container } = render(
      <CollectionGridOverlay open={false} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("rend le titre Collection quand ouvert", () => {
    render(<CollectionGridOverlay open onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Collection" })).toBeTruthy();
  });
});
