// @vitest-environment jsdom
/**
 * AlbumTimbresOverlay — l'album de timbres (2 pages à 5 lignes aimantées +
 * bac « en vrac » en bas, glisser-déposer au pointeur).
 *
 * Mocke `@/context/GameContext` comme `ClasseurOverlay.test.tsx` : un
 * `state.albums.timbres` maîtrisé (3 timbres possédés dont 1 posé sur la
 * ligne 2 de la page 0) + les actions en espion.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AlbumTimbresOverlay } from "./AlbumTimbresOverlay";
import { piecesDe } from "@/data/pieces";
import type { AlbumsState } from "@/types/game";

const pieces = piecesDe("timbres");
const t0 = pieces[0].id;
const t1 = pieces[1].id;
const t2 = pieces[2].id;

function albumsAvec(): AlbumsState {
  return {
    classeur: { achete: false, pieces: {}, nouvelles: [] },
    timbres: {
      achete: true,
      pieces: { [t0]: 1, [t1]: 1, [t2]: 1 },
      nouvelles: [],
      placements: { [t2]: { page: 0, ligne: 2, x: 0.5 } },
      ordreZ: [t2],
    },
  };
}

const { mocks } = vi.hoisted(() => ({
  mocks: {
    recyclerDoublonsAlbum: vi.fn(() => 0),
    marquerPieceConsultee: vi.fn(),
    poserTimbre: vi.fn(),
    rendreTimbreAuBac: vi.fn(),
  },
}));

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    isHydrated: true,
    state: { albums: albumsAvec() },
    recyclerDoublonsAlbum: mocks.recyclerDoublonsAlbum,
    marquerPieceConsultee: mocks.marquerPieceConsultee,
    poserTimbre: mocks.poserTimbre,
    rendreTimbreAuBac: mocks.rendreTimbreAuBac,
  }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  useToastSafe: () => ({ toast: vi.fn() }),
}));

afterEach(cleanup);

describe("AlbumTimbresOverlay", () => {
  it("les timbres sans placement sont dans le bac, le timbre posé sur sa ligne", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    expect(within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")).toHaveLength(2);
    const pose = screen.getByTestId("timbre-pose");
    expect(pose.style.top).toBe("50%"); // ligne 2
  });

  it("lâcher un timbre du bac sur la page appelle poserTimbre avec la ligne aimantée", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const page = screen.getByTestId("page-timbres");
    page.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 300, height: 390, right: 300, bottom: 390, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    fireEvent.pointerDown(t, { clientX: 10, clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(t, { clientX: 150, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(t, { clientX: 150, clientY: 200, pointerId: 1 });
    expect(mocks.poserTimbre).toHaveBeenCalledWith(expect.any(String), 0, 2, 0.5);
  });

  it("un tap sans mouvement ouvre la fiche avec « Poser sur la page »", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    fireEvent.pointerDown(t, { clientX: 10, clientY: 500, pointerId: 1 });
    fireEvent.pointerUp(t, { clientX: 12, clientY: 501, pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Poser sur la page" }));
    expect(mocks.poserTimbre).toHaveBeenCalledWith(expect.any(String), 0, 0, 0.1);
  });
});
