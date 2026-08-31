// @vitest-environment jsdom
/**
 * ClasseurOverlay — le classeur de cartes (6 pages de 9 pochettes).
 *
 * Mocke `@/context/GameContext` comme `src/app/collection/page.test.tsx` :
 * un `state.albums` maîtrisé (2 pièces dont une en double, sur la 1ère
 * page) + les 4 actions du contexte en espion.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClasseurOverlay } from "./ClasseurOverlay";
import { piecesDe } from "@/data/pieces";
import type { AlbumsState } from "@/types/game";

const pieces = piecesDe("classeur");
const p0 = pieces[0].id;
const p1 = pieces[1].id;

const albums: AlbumsState = {
  classeur: { achete: true, pieces: { [p0]: 1, [p1]: 2 }, nouvelles: [] },
  timbres: { achete: false, pieces: {}, nouvelles: [], placements: {}, ordreZ: [] },
};

const { mocks } = vi.hoisted(() => ({
  mocks: {
    recyclerDoublonsAlbum: vi.fn(() => 2),
    marquerPieceConsultee: vi.fn(),
    toast: vi.fn(),
  },
}));

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    isHydrated: true,
    state: { albums },
    recyclerDoublonsAlbum: mocks.recyclerDoublonsAlbum,
    marquerPieceConsultee: mocks.marquerPieceConsultee,
    poserTimbre: vi.fn(),
    rendreTimbreAuBac: vi.fn(),
  }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
  useToastSafe: () => ({ toast: mocks.toast }),
}));

afterEach(cleanup);

describe("ClasseurOverlay", () => {
  it("affiche 9 pochettes par page, le compteur et le badge ×N", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    expect(screen.getByText("2 / 50")).toBeTruthy();
    expect(document.querySelectorAll('[data-testid="pochette"]')).toHaveLength(9);
    expect(screen.getByText("×2")).toBeTruthy();
  });

  it("page suivante → les 9 pochettes suivantes", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Page suivante" }));
    expect(screen.getByText("2 / 6")).toBeTruthy();
  });

  // M5 revue finale 2026-08-30 : un swipe interrompu (appel, notification…)
  // ne doit pas laisser `startXRef` posé pour un lâcher tardif/fantôme.
  it("un swipe interrompu (pointercancel) ne tourne pas la page au lâcher qui suit", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    const page = screen.getByTestId("page-classeur");
    fireEvent.pointerDown(page, { clientX: 200 });
    fireEvent.pointerCancel(page);
    fireEvent.pointerUp(page, { clientX: 100 }); // dx = -100 : aurait tourné la page
    expect(screen.getByText("1 / 6")).toBeTruthy();
  });

  it("le doigt qui sort de la zone (pointerleave) sans relâcher ne tourne pas non plus la page", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    const page = screen.getByTestId("page-classeur");
    fireEvent.pointerDown(page, { clientX: 200 });
    fireEvent.pointerLeave(page);
    fireEvent.pointerUp(page, { clientX: 100 });
    expect(screen.getByText("1 / 6")).toBeTruthy();
  });

  it("recycler : confirmation puis appel, toast au pluriel (n=2)", () => {
    const { recyclerDoublonsAlbum } = mocks;
    render(<ClasseurOverlay open onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /recycler les doublons \(1\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /^recycler/i, hidden: false }));
    expect(recyclerDoublonsAlbum).toHaveBeenCalledWith("classeur");
    expect(mocks.toast).toHaveBeenCalledWith(
      "+2 pièces · Jeux & Loisirs",
      expect.objectContaining({ type: "succes" }),
    );
  });

  // M10 revue finale 2026-08-30 : « +1 pièce », pas « +1 pièces ».
  it("recycler un seul doublon : toast au singulier (n=1)", () => {
    mocks.recyclerDoublonsAlbum.mockReturnValueOnce(1);
    render(<ClasseurOverlay open onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /recycler les doublons \(1\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /^recycler/i, hidden: false }));
    expect(mocks.toast).toHaveBeenCalledWith(
      "+1 pièce · Jeux & Loisirs",
      expect.objectContaining({ type: "succes" }),
    );
  });

  it("tap sur une carte possédée ouvre la fiche et marque la pièce consultée", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    fireEvent.click(screen.getAllByTestId("pochette")[0]);
    expect(mocks.marquerPieceConsultee).toHaveBeenCalled();
    expect(screen.getByTestId("fiche-visuel")).toBeTruthy();
  });
});
