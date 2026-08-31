// @vitest-environment jsdom
/**
 * En-tête de la page Collection.
 *
 * Retour device 2026-08-26 : le titre était centré (grille `1fr auto 1fr`),
 * ce qui n'accorde à la valeur de la collection qu'un tiers de la largeur —
 * elle s'y tronquait. Le titre passe à gauche, la valeur prend toute la
 * place restante à droite (mode `left` de `PageHeaderBar`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CollectionPage from "./page";
import { CATEGORIES } from "@/data/categories";
import { initAlbums } from "@/lib/albums";
import { piecesDe } from "@/data/pieces";
import type { AlbumsState } from "@/types/game";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/collection",
}));

const collectionVide = Object.fromEntries(CATEGORIES.map((c) => [c, []]));

// Requis par `ClasseurOverlay`/`AlbumTimbresOverlay` (Tâche 13, câblées à la
// page) — `useGame()` les destructure inconditionnellement.
const recyclerDoublonsAlbum = vi.fn();
const marquerPieceConsultee = vi.fn();
const poserTimbre = vi.fn();
const rendreTimbreAuBac = vi.fn();

let mockAlbums: AlbumsState = initAlbums();

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    isHydrated: true,
    state: {
      budget: 100,
      jetons: 0,
      collection: collectionVide,
      inventaireJoueur: [],
      brocanteur: { niveau: 1, xp: 0, pointsDisponibles: 0, competences: {} },
      niveauStockage: 1,
      competencesDebloquees: [],
      tutorielEtape: "termine",
      albums: mockAlbums,
    },
    donnerACollection: vi.fn(),
    retirerDeCollection: vi.fn(),
    marquerVuDansCollection: vi.fn(),
    recyclerDoublonsAlbum,
    marquerPieceConsultee,
    poserTimbre,
    rendreTimbreAuBac,
  }),
  useGameActions: () => ({ avancerTutoriel: vi.fn(), tempsConfiance: () => Date.now() }),
  useGameStateOnly: () => ({ state: null }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  useToastSafe: () => ({ toast: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  mockAlbums = initAlbums();
});

describe("Collection — en-tête", () => {
  it("le titre est justifié à gauche, la valeur à droite", () => {
    render(<CollectionPage />);
    // Plus de tiret À GAUCHE depuis le passage au mode « left ».
    const titre = screen.getByText(/^COLLECTION —$/i);
    const barre = titre.parentElement as HTMLElement;
    // Mode "left" de PageHeaderBar : deux zones poussées aux extrémités,
    // le titre EN PREMIER. Le mode "center" produisait une grille.
    expect(barre.style.display).toBe("flex");
    expect(barre.style.justifyContent).toBe("space-between");
    expect(barre.firstElementChild).toBe(titre);
  });

  it("la valeur de la collection occupe la zone de droite", () => {
    render(<CollectionPage />);
    const valeur = document.querySelector('[data-tuto-coach="collection-valeur"]');
    expect(valeur).not.toBeNull();
    const zone = valeur!.parentElement as HTMLElement;
    expect(zone.style.justifyContent).toBe("flex-end");
    const barre = zone.parentElement as HTMLElement;
    expect(barre.lastElementChild).toBe(zone);
  });
});

/**
 * Tuiles Classeur de cartes / Album de timbres (Tâche 13) : injectées dans
 * la grille de la Collection via `casesSpeciales` de `CollectionGrid`.
 *
 * `MobileLayout` expose un `<main>` réellement `overflow-y: auto` : jsdom
 * calcule bien son overflow (styles inline, lus par `getComputedStyle`),
 * donc `CollectionGrid` y prend la branche virtualisée — contrairement aux
 * tests de `CollectionGrid` isolé, jamais montés sous un tel ancêtre. Or
 * `@tanstack/react-virtual` mesure le viewport via `offsetHeight`, toujours
 * 0 en jsdom (pas de layout réel) : sans ce stub, la plage visible calculée
 * est vide et AUCUNE case (slot ou spéciale) ne rend, quel que soit le
 * contenu passé à `CollectionGrid`.
 */
describe("Collection — tuiles d'album", () => {
  let offsetHeightDesc: PropertyDescriptor | undefined;

  beforeEach(() => {
    offsetHeightDesc = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetHeight",
    );
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get: () => 800,
    });
  });

  afterEach(() => {
    if (offsetHeightDesc) {
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", offsetHeightDesc);
    }
  });

  it("montre deux tuiles d'album cadenassées avant achat", () => {
    render(<CollectionPage />);
    const tuiles = screen.getAllByTestId("tuile-album") as HTMLButtonElement[];
    expect(tuiles).toHaveLength(2);
    // Le dépôt n'installe pas jest-dom : lecture directe des propriétés DOM.
    expect(tuiles[0].disabled).toBe(true);
    expect(tuiles[0].getAttribute("aria-label")).toContain("En vente au Bazar");
  });

  it("après achat, la tuile porte le compteur et ouvre le classeur", () => {
    const [c0, c1, c2] = piecesDe("classeur").map((p) => p.id);
    mockAlbums = {
      classeur: { achete: true, pieces: { [c0]: 1, [c1]: 1, [c2]: 1 }, nouvelles: [] },
      timbres: initAlbums().timbres,
    };
    render(<CollectionPage />);
    const t = screen.getAllByTestId("tuile-album")[0];
    // Même gabarit i18n que le compteur d'AlbumShell ("{n} / {total}").
    expect(t.textContent).toContain("3 / 50");
    expect(t.getAttribute("aria-label")).toContain("3 / 50");
    fireEvent.click(t);
    expect(screen.getByRole("dialog", { name: "Classeur de cartes" })).toBeTruthy();
  });
});
