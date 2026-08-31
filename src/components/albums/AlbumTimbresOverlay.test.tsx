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
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
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
    expect(
      within(screen.getByTestId("bac")).getAllByTestId("timbre-bac"),
    ).toHaveLength(2);
    const pose = screen.getByTestId("timbre-pose");
    expect(pose.style.top).toBe("50%"); // ligne 2
  });

  it("lâcher un timbre du bac sur la page appelle poserTimbre avec la ligne aimantée", () => {
    vi.useFakeTimers();
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const page = screen.getByTestId("page-timbres");
    page.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 300,
        height: 390,
        right: 300,
        bottom: 390,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    fireEvent.pointerDown(t, { clientX: 10, clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(t, { clientX: 150, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(t, { clientX: 150, clientY: 200, pointerId: 1 });
    // La pose est commitée à l'arrivée du calque sur sa ligne (150 ms).
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(mocks.poserTimbre).toHaveBeenCalledWith(
      expect.any(String),
      0,
      2,
      0.5,
    );
    vi.useRealTimers();
  });

  it("un tap sans mouvement ouvre la fiche avec « Poser sur la page »", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    fireEvent.pointerDown(t, { clientX: 10, clientY: 500, pointerId: 1 });
    fireEvent.pointerUp(t, { clientX: 12, clientY: 501, pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Poser sur la page" }));
    expect(mocks.poserTimbre).toHaveBeenCalledWith(
      expect.any(String),
      0,
      0,
      0.1,
    );
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
    vi.useFakeTimers();
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const bac = screen.getByTestId("bac");
    bac.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 400,
        width: 300,
        height: 80,
        right: 300,
        bottom: 480,
        x: 0,
        y: 400,
        toJSON: () => ({}),
      }) as DOMRect;
    const posee = screen.getByTestId("timbre-pose");
    fireEvent.pointerDown(posee, { clientX: 150, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(posee, { clientX: 150, clientY: 440, pointerId: 1 });
    fireEvent.pointerUp(posee, { clientX: 150, clientY: 440, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(mocks.rendreTimbreAuBac).toHaveBeenCalledWith(t2);
    vi.useRealTimers();
  });

  // ── I4 revue finale 2026-08-30 ────────────────────────────────────────
  it("le bac défile au doigt : touchAction pan-x sur ses items, none sur un timbre posé", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const item = within(screen.getByTestId("bac")).getAllByTestId(
      "timbre-bac",
    )[0];
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
    const items = within(screen.getByTestId("bac")).getAllByTestId(
      "timbre-bac",
    );
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
      ({
        left: 0,
        top: 0,
        width: 300,
        height: 390,
        right: 300,
        bottom: 390,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
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
    expect(screen.getByTestId("bac").getAttribute("aria-label")).toBe(
      "En vrac",
    );
  });
});

/* ── Vrai album à bandes + glisser fluide (retour Guillaume 2026-08-31) ── */
describe("AlbumTimbresOverlay — bandes et glisser fluide", () => {
  function pageRect300x390() {
    const page = screen.getByTestId("page-timbres");
    page.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 300,
        height: 390,
        right: 300,
        bottom: 390,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    return page;
  }

  it("la page porte 5 bandeaux translucides insensibles au pointeur, et plus aucun pointillé", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    const page = screen.getByTestId("page-timbres");
    const bandes = within(page).getAllByTestId("bandeau");
    expect(bandes).toHaveLength(5);
    for (const b of bandes) {
      expect(b.style.pointerEvents).toBe("none");
      expect(b.style.backgroundColor).toContain("rgba(255");
    }
    expect(page.querySelectorAll('[style*="dashed"]')).toHaveLength(0);
  });

  it("pendant le glisser, le timbre d'origine s'efface et le calque mobile suit le doigt (transform écrit sans re-rendu)", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    pageRect300x390();
    const pose = screen.getByTestId("timbre-pose");
    fireEvent.pointerDown(pose, { clientX: 150, clientY: 195, pointerId: 1 });
    fireEvent.pointerMove(pose, { clientX: 160, clientY: 120, pointerId: 1 });
    expect(pose.style.opacity).toBe("0");
    const calque = screen.getByTestId("timbre-fantome");
    expect(calque.style.transform).toContain("translate3d(160px, 120px");
    fireEvent.pointerMove(pose, { clientX: 170, clientY: 100, pointerId: 1 });
    expect(calque.style.transform).toContain("translate3d(170px, 100px");
    expect(calque.style.transition).toBe("none");
  });

  it("le bandeau de la ligne visée s'éclaire pendant le survol de la page", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    pageRect300x390();
    const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    fireEvent.pointerDown(t, { clientX: 10, clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(t, { clientX: 150, clientY: 200, pointerId: 1 }); // y = 0,51 → ligne 2
    const bandes = within(screen.getByTestId("page-timbres")).getAllByTestId(
      "bandeau",
    );
    expect(bandes.map((b) => b.dataset.vise)).toEqual([
      "false",
      "false",
      "true",
      "false",
      "false",
    ]);
    fireEvent.pointerMove(t, { clientX: 150, clientY: 600, pointerId: 1 }); // hors page
    expect(bandes.every((b) => b.dataset.vise === "false")).toBe(true);
  });

  it("un timbre posé lâché hors de l'album (ni page ni bac) glisse vers « En vrac » puis y est rendu", () => {
    vi.useFakeTimers();
    mocks.rendreTimbreAuBac.mockClear();
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    pageRect300x390();
    const bac = screen.getByTestId("bac");
    bac.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 400,
        width: 300,
        height: 80,
        right: 300,
        bottom: 480,
        x: 0,
        y: 400,
        toJSON: () => ({}),
      }) as DOMRect;
    const pose = screen.getByTestId("timbre-pose");
    fireEvent.pointerDown(pose, { clientX: 150, clientY: 195, pointerId: 1 });
    fireEvent.pointerMove(pose, { clientX: 160, clientY: 900, pointerId: 1 });
    fireEvent.pointerUp(pose, { clientX: 160, clientY: 900, pointerId: 1 });
    const calque = screen.getByTestId("timbre-fantome");
    expect(calque.style.transition).toContain("transform");
    expect(calque.style.transform).toContain(", 440px"); // centre vertical du bac
    expect(mocks.rendreTimbreAuBac).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(mocks.rendreTimbreAuBac).toHaveBeenCalledWith(expect.any(String));
    expect(screen.queryByTestId("timbre-fantome")).toBeNull();
    vi.useRealTimers();
  });

  it("un timbre du bac lâché hors de l'album revient dans le bac, sans appel d'état", () => {
    vi.useFakeTimers();
    mocks.rendreTimbreAuBac.mockClear();
    mocks.poserTimbre.mockClear();
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    pageRect300x390();
    const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    fireEvent.pointerDown(t, { clientX: 10, clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(t, { clientX: 300, clientY: 900, pointerId: 1 });
    fireEvent.pointerUp(t, { clientX: 300, clientY: 900, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(mocks.rendreTimbreAuBac).not.toHaveBeenCalled();
    expect(mocks.poserTimbre).not.toHaveBeenCalled();
    expect(screen.queryByTestId("timbre-fantome")).toBeNull();
    expect(t.style.opacity).not.toBe("0");
    vi.useRealTimers();
  });
});

/* ── Dépôt animé, tolérance, sans transition sur les timbres posés ──────── */
describe("AlbumTimbresOverlay — dépôt", () => {
  function pageRect300x390() {
    const page = screen.getByTestId("page-timbres");
    page.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 300,
        height: 390,
        right: 300,
        bottom: 390,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    return page;
  }
  afterEach(() => {
    vi.useRealTimers();
  });

  it("au lâcher sur la page, le calque glisse vers la place aimantée et poserTimbre n'est appelé qu'à l'arrivée", () => {
    vi.useFakeTimers();
    mocks.poserTimbre.mockClear();
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    pageRect300x390();
    const t = within(screen.getByTestId("bac")).getAllByTestId("timbre-bac")[0];
    fireEvent.pointerDown(t, { clientX: 10, clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(t, { clientX: 150, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(t, { clientX: 150, clientY: 200, pointerId: 1 });
    const calque = screen.getByTestId("timbre-fantome");
    expect(calque.style.transition).toContain("transform");
    expect(calque.style.transform).toContain("translate3d(150px, 195px"); // ligne 2 → y = 0,5 × 390
    expect(t.style.opacity).toBe("0"); // l'original reste effacé pendant le glissé
    expect(mocks.poserTimbre).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(mocks.poserTimbre).toHaveBeenCalledWith(
      expect.any(String),
      0,
      2,
      0.5,
    );
    expect(screen.queryByTestId("timbre-fantome")).toBeNull();
  });

  it("un nouveau geste pendant le glissé d'arrivée commite la pose immédiatement", () => {
    vi.useFakeTimers();
    mocks.poserTimbre.mockClear();
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    pageRect300x390();
    const [a, b] = within(screen.getByTestId("bac")).getAllByTestId(
      "timbre-bac",
    );
    fireEvent.pointerDown(a, { clientX: 10, clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(a, { clientX: 150, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(a, { clientX: 150, clientY: 200, pointerId: 1 });
    expect(mocks.poserTimbre).not.toHaveBeenCalled();
    fireEvent.pointerDown(b, { clientX: 80, clientY: 500, pointerId: 2 });
    expect(mocks.poserTimbre).toHaveBeenCalledTimes(1);
  });

  it("la frontière est le rectangle anthracite : un lâcher 10 px au-dessus ne pose pas, il part en vrac", () => {
    vi.useFakeTimers();
    mocks.poserTimbre.mockClear();
    mocks.rendreTimbreAuBac.mockClear();
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    pageRect300x390();
    const pose = screen.getByTestId("timbre-pose");
    fireEvent.pointerDown(pose, { clientX: 150, clientY: 195, pointerId: 1 });
    fireEvent.pointerMove(pose, { clientX: 150, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(pose, { clientX: 150, clientY: -10, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(mocks.poserTimbre).not.toHaveBeenCalled();
    expect(mocks.rendreTimbreAuBac).toHaveBeenCalledWith(expect.any(String));
  });

  it("les timbres posés n'ont plus de transition de position (le calque porte le mouvement)", () => {
    render(<AlbumTimbresOverlay open onClose={() => {}} />);
    expect(screen.getByTestId("timbre-pose").style.transition).toBe("");
  });
});

/* Le panneau porte un `backdrop-filter`, qui fait de lui le bloc conteneur
   de tout `position: fixed` descendant : un calque rendu DEDANS se décale de
   la hauteur de l'en-tête et suit le doigt « par en dessous » (recette
   2026-08-31). Le calque doit donc vivre hors du panneau, sur le body. */
it("le calque qui suit le doigt est rendu hors du panneau (portail sur le body)", () => {
  render(<AlbumTimbresOverlay open onClose={() => {}} />);
  const pose = screen.getByTestId("timbre-pose");
  fireEvent.pointerDown(pose, { clientX: 150, clientY: 195, pointerId: 1 });
  fireEvent.pointerMove(pose, { clientX: 160, clientY: 120, pointerId: 1 });
  const calque = screen.getByTestId("timbre-fantome");
  expect(screen.getByRole("dialog").contains(calque)).toBe(false);
  expect(calque.parentElement).toBe(document.body);
});

it("album de timbres : aucun titre visible, flèches de pagination sans cadre", () => {
  render(<AlbumTimbresOverlay open onClose={() => {}} />);
  expect(screen.queryByText("Album de timbres")).toBeNull();
  expect(screen.getByRole("dialog", { name: "Album de timbres" })).toBeTruthy();
  for (const nom of ["Page précédente", "Page suivante"]) {
    const btn = screen.getByRole("button", { name: nom }) as HTMLButtonElement;
    expect(btn.style.border).not.toContain("solid");
  }
});

/* Responsivité (iPad, fenêtre large — recette 2026-08-31) : la page ne doit
   jamais être écrasée en hauteur par le flex ; sa largeur est bornée par la
   hauteur disponible (ratio 1,3 conservé) et la colonne page + bac +
   pagination est centrée. */
it("la colonne de l'album est bornée par la hauteur disponible et centrée, la page ne rétrécit pas", () => {
  render(<AlbumTimbresOverlay open onClose={() => {}} />);
  const page = screen.getByTestId("page-timbres") as HTMLElement;
  const colonne = page.parentElement as HTMLElement;
  expect(colonne.style.maxWidth).toContain("100dvh - (calc(var(--safe-top)");
  expect(colonne.style.maxWidth).toContain(") - (calc(var(--mobile-tabbar-h)");
  expect(colonne.style.maxWidth).toContain("/ 1.3");
  expect(colonne.style.margin).toBe("0px auto");
  expect(colonne.style.width).toBe("100%");
  expect(page.style.flexShrink).toBe("0");
});
