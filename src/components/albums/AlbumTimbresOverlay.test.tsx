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
    toast: vi.fn(),
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
  useToast: () => ({ toast: mocks.toast }),
  useToastSafe: () => ({ toast: mocks.toast }),
}));

afterEach(cleanup);

describe("AlbumTimbresOverlay", () => {
  // En premier : les autres tests appellent `poserTimbre`/`rendreTimbreAuBac`
  // sur les mêmes espions (pas de `resetMocks` dans ce dépôt) — un « pas
  // appelé » n'est fiable que tant que rien d'autre ne l'a encore appelé.
  it("un geste interrompu (pointercancel) efface le fantôme sans poser ni rendre", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    fireEvent.pointerDown(t, { clientX: 10, clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(t, { clientX: 150, clientY: 200, pointerId: 1 });
    expect(screen.getByTestId("timbre-fantome")).toBeTruthy();
    fireEvent.pointerCancel(t, { pointerId: 1 });
    expect(screen.queryByTestId("timbre-fantome")).toBeNull();
    expect(mocks.poserTimbre).not.toHaveBeenCalled();
    expect(mocks.rendreTimbreAuBac).not.toHaveBeenCalled();
  });

  // M5 revue finale 2026-08-30 : un swipe de page interrompu ne doit pas
  // laisser `swipeStartRef` posé pour un lâcher tardif/fantôme.
  it("un swipe de page interrompu (pointercancel) ne tourne pas la page au lâcher qui suit", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const page = screen.getByTestId("page-timbres");
    fireEvent.pointerDown(page, { clientX: 200 });
    fireEvent.pointerCancel(page);
    fireEvent.pointerUp(page, { clientX: 100 }); // dx = -100 : aurait tourné la page
    expect(screen.getByText("1 / 2")).toBeTruthy();
  });

  it("le doigt qui sort de la zone (pointerleave) sans relâcher ne tourne pas non plus la page", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const page = screen.getByTestId("page-timbres");
    fireEvent.pointerDown(page, { clientX: 200 });
    fireEvent.pointerLeave(page);
    fireEvent.pointerUp(page, { clientX: 100 });
    expect(screen.getByText("1 / 2")).toBeTruthy();
  });

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

  it("un tap sur un timbre posé ouvre la fiche avec « Rendre au bac »", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const posee = screen.getByTestId("timbre-pose");
    fireEvent.pointerDown(posee, { clientX: 10, clientY: 500, pointerId: 1 });
    fireEvent.pointerUp(posee, { clientX: 12, clientY: 501, pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Rendre au bac" }));
    expect(mocks.rendreTimbreAuBac).toHaveBeenCalledWith(t2);
  });

  it("glisser un timbre posé et le lâcher sur le bac appelle rendreTimbreAuBac", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const bac = screen.getByTestId("bac");
    bac.getBoundingClientRect = () =>
      ({ left: 0, top: 400, width: 300, height: 80, right: 300, bottom: 480, x: 0, y: 400, toJSON: () => ({}) }) as DOMRect;
    const posee = screen.getByTestId("timbre-pose");
    fireEvent.pointerDown(posee, { clientX: 150, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(posee, { clientX: 150, clientY: 440, pointerId: 1 });
    fireEvent.pointerUp(posee, { clientX: 150, clientY: 440, pointerId: 1 });
    expect(mocks.rendreTimbreAuBac).toHaveBeenCalledWith(t2);
  });

  // ── I4 revue finale 2026-08-30 ────────────────────────────────────────
  it("le bac défile au doigt : touchAction pan-x sur ses items, none sur un timbre posé", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const item = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    expect(item.style.touchAction).toBe("pan-x");
    const pose = screen.getByTestId("timbre-pose");
    expect(pose.style.touchAction).toBe("none");
  });

  it("un mouvement surtout horizontal dans le bac ne déclenche pas le fantôme (le défilement natif reste libre)", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    fireEvent.pointerDown(t, { clientX: 10, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(t, { clientX: 60, clientY: 205, pointerId: 1 }); // dx=50, dy=5
    expect(screen.queryByTestId("timbre-fantome")).toBeNull();
  });

  it("un mouvement vertical au-delà de 12 px dans le bac déclenche le fantôme même si l'horizontal domine", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    fireEvent.pointerDown(t, { clientX: 10, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(t, { clientX: 60, clientY: 215, pointerId: 1 }); // dx=50, dy=15 (>12)
    expect(screen.getByTestId("timbre-fantome")).toBeTruthy();
  });

  it("un timbre du bac est un bouton nommé (nom + ×N si doublon), activable au clavier", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const items = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac");
    expect(items[0].tagName).toBe("BUTTON");
    expect(items[0].getAttribute("aria-label")).toBeTruthy();
    fireEvent.keyDown(items[0], { key: "Enter" });
    expect(mocks.marquerPieceConsultee).toHaveBeenCalledWith(t0);
  });

  it("la touche Espace sur un timbre posé ouvre aussi la fiche", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const pose = screen.getByTestId("timbre-pose");
    fireEvent.keyDown(pose, { key: " " });
    expect(mocks.marquerPieceConsultee).toHaveBeenCalledWith(t2);
  });

  // Réserve finale : sur souris/trackpad, un `click` natif suit un `mouseup`
  // même après un glisser (la capture de pointeur garde la même cible) — ce
  // `click` ne doit PAS rouvrir la fiche par-dessus le geste de pose/retour.
  it("un clic natif consécutif à un glisser (pointerUp > seuil) n'ouvre pas la fiche", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const page = screen.getByTestId("page-timbres");
    page.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 300, height: 390, right: 300, bottom: 390, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    fireEvent.pointerDown(t, { clientX: 10, clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(t, { clientX: 150, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(t, { clientX: 150, clientY: 200, pointerId: 1 });
    mocks.marquerPieceConsultee.mockClear();
    // Le navigateur envoie ce `click` après le `pointerup`, sur la même cible
    // (pointer capture) — même si le geste était un glisser.
    fireEvent.click(t);
    expect(mocks.marquerPieceConsultee).not.toHaveBeenCalled();
  });

  it("un timbre posé est un bouton nommé", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const pose = screen.getByTestId("timbre-pose");
    expect(pose.tagName).toBe("BUTTON");
    expect(pose.getAttribute("aria-label")).toBeTruthy();
  });

  it("le libellé « En vrac » est affiché au-dessus du bac, et porté par son aria-label", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    expect(screen.getByText("En vrac")).toBeTruthy();
    expect(screen.getByTestId("bac").getAttribute("aria-label")).toBe("En vrac");
  });
});
