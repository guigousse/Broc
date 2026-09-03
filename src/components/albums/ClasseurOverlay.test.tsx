// @vitest-environment jsdom
/**
 * ClasseurOverlay — le classeur de cartes (6 pages de 9 pochettes).
 *
 * Mocke `@/context/GameContext` comme `src/app/collection/page.test.tsx` :
 * un `state.albums` maîtrisé (2 pièces dont une en double, sur la 1ère
 * page) + les 4 actions du contexte en espion.
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
import { ClasseurOverlay } from "./ClasseurOverlay";
import { piecesDe } from "@/data/pieces";
import type { AlbumsState } from "@/types/game";

const pieces = piecesDe("classeur");
const p0 = pieces[0].id;
const p1 = pieces[1].id;

const albums: AlbumsState = {
  classeur: { achete: true, pieces: { [p0]: 1, [p1]: 2 }, nouvelles: [] },
  timbres: {
    achete: false,
    pieces: {},
    nouvelles: [],
    placements: {},
    ordreZ: [],
  },
};

const { mocks } = vi.hoisted(() => ({
  mocks: {
    recyclerDoublonsAlbum: vi.fn(() => 2),
    marquerPieceConsultee: vi.fn(),
    deplacerCarte: vi.fn(),
    toast: vi.fn(),
  },
}));

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    isHydrated: true,
    state: { albums },
    recyclerDoublonsAlbum: mocks.recyclerDoublonsAlbum,
    marquerPieceConsultee: mocks.marquerPieceConsultee,
    deplacerCarte: mocks.deplacerCarte,
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
  // Placement manuel (2026-09-03) : les cartes possédées occupent leur
  // pochette (par défaut celle de leur `ordre`), les 7 autres cases de la
  // page sont des pochettes VIDES délimitées.
  it("affiche 2 cartes + 7 pochettes vides, le compteur et le badge ×N", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    expect(screen.getByText("2 / 50")).toBeTruthy();
    expect(document.querySelectorAll('[data-testid="pochette"]')).toHaveLength(
      2,
    );
    expect(
      document.querySelectorAll('[data-testid="pochette-vide"]'),
    ).toHaveLength(7);
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
    fireEvent.click(
      screen.getByRole("button", { name: /recycler les doublons \(1\)/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /^recycler/i, hidden: false }),
    );
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
    fireEvent.click(
      screen.getByRole("button", { name: /recycler les doublons \(1\)/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /^recycler/i, hidden: false }),
    );
    expect(mocks.toast).toHaveBeenCalledWith(
      "+1 pièce · Jeux & Loisirs",
      expect.objectContaining({ type: "succes" }),
    );
  });

  it("tap (sans mouvement) sur une carte ouvre la fiche et marque la pièce consultée", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    const carte = screen.getAllByTestId("pochette")[0];
    fireEvent.pointerDown(carte, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(carte, { clientX: 52, clientY: 51, pointerId: 1 });
    expect(mocks.marquerPieceConsultee).toHaveBeenCalled();
    expect(screen.getByTestId("fiche-visuel")).toBeTruthy();
  });
});

/* ── Placement manuel des cartes (recette 2026-09-03) ─────────────────────
   La carte suit le doigt (calque en portail), va PILE dans la pochette
   visée (jamais entre deux), et un lâcher hors grille la renvoie chez elle. */
describe("ClasseurOverlay — glisser une carte vers un slot", () => {
  /** Donne un rect à chacune des 9 cases : 3 colonnes × 3 lignes de 100px. */
  function poserRects() {
    const cases = document.querySelectorAll(
      '[data-testid="pochette"], [data-testid="pochette-vide"]',
    );
    cases.forEach((el, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      (el as HTMLElement).getBoundingClientRect = () =>
        ({
          left: col * 100,
          top: row * 100,
          right: col * 100 + 100,
          bottom: row * 100 + 100,
          width: 100,
          height: 100,
          x: col * 100,
          y: row * 100,
          toJSON: () => ({}),
        }) as DOMRect;
    });
  }

  it("lâcher sur une pochette vide appelle deplacerCarte avec son slot, à l'arrivée du calque", () => {
    vi.useFakeTimers();
    mocks.deplacerCarte.mockClear();
    render(<ClasseurOverlay open onClose={() => {}} />);
    poserRects();
    const carte = screen.getAllByTestId("pochette")[0]; // slot 0 (p0, ordre 0)
    fireEvent.pointerDown(carte, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(carte, { clientX: 250, clientY: 150, pointerId: 1 });
    expect(screen.getByTestId("carte-fantome")).toBeTruthy();
    fireEvent.pointerUp(carte, { clientX: 250, clientY: 150, pointerId: 1 });
    expect(mocks.deplacerCarte).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(160);
    });
    // (250, 150) = colonne 2, ligne 1 → case 5 de la page 0.
    expect(mocks.deplacerCarte).toHaveBeenCalledWith(p0, 5);
    expect(screen.queryByTestId("carte-fantome")).toBeNull();
    vi.useRealTimers();
  });

  it("lâcher HORS de la grille renvoie la carte chez elle, sans deplacerCarte", () => {
    vi.useFakeTimers();
    mocks.deplacerCarte.mockClear();
    render(<ClasseurOverlay open onClose={() => {}} />);
    poserRects();
    const carte = screen.getAllByTestId("pochette")[0];
    fireEvent.pointerDown(carte, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(carte, { clientX: 600, clientY: 600, pointerId: 1 });
    fireEvent.pointerUp(carte, { clientX: 600, clientY: 600, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(mocks.deplacerCarte).not.toHaveBeenCalled();
    expect(screen.queryByTestId("carte-fantome")).toBeNull();
    vi.useRealTimers();
  });

  it("un geste interrompu (pointercancel) efface le calque sans déplacer", () => {
    mocks.deplacerCarte.mockClear();
    render(<ClasseurOverlay open onClose={() => {}} />);
    poserRects();
    const carte = screen.getAllByTestId("pochette")[0];
    fireEvent.pointerDown(carte, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(carte, { clientX: 250, clientY: 150, pointerId: 1 });
    fireEvent.pointerCancel(carte, { pointerId: 1 });
    expect(screen.queryByTestId("carte-fantome")).toBeNull();
    expect(mocks.deplacerCarte).not.toHaveBeenCalled();
  });
});

/* ── Mise en page plein écran (retour Guillaume 2026-08-31) ───────────────
   Le classeur n'est plus une carte bordée qui défile : un panneau fixe qui
   couvre l'écran, et une grille 3×3 dont les 9 cases (pochettes ET « à
   venir ») ont exactement la même boîte, quelle que soit l'image dedans. */
describe("ClasseurOverlay — plein écran", () => {
  it("le panneau est fixe ENTRE l'en-tête et la TabBar (qui restent accessibles) et ne défile pas", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    const dialog = screen.getByRole("dialog") as HTMLElement;
    expect(dialog.style.position).toBe("fixed");
    // Même calage que CarnetOverlay / FloatingRoomOverlay.
    expect(dialog.style.top).toBe(
      "calc(var(--safe-top) + var(--mobile-header-h) + var(--tuto-banniere-h, 0px))",
    );
    expect(dialog.style.bottom).toBe(
      "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
    );
    expect(dialog.style.left).toBe("0px");
    expect(dialog.style.right).toBe("0px");
    expect(dialog.style.overflowY).not.toBe("auto");
    expect(dialog.style.border).toBe("");
  });

  // Le titre avait été retiré à la recette du 2026-08-31, puis REPRIS au
  // centre de l'en-tête à la refonte du 2026-09-02, comme l'album de timbres.
  it("le titre est visible dans l'en-tête ET porté par l'aria-label du dialog", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    expect(screen.getByText("Classeur de cartes")).toBeTruthy();
    expect(
      screen.getByRole("dialog", { name: "Classeur de cartes" }),
    ).toBeTruthy();
  });

  /** Recette 2026-09-02 : chaque emplacement porte son numéro, continu à
   *  travers les pages — cases « à venir » comprises. */
  it("les emplacements sont numérotés, en continu d'une page à l'autre", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    const grille = () => within(screen.getByTestId("page-classeur"));
    // Page 1 : numéros 1 à 9.
    for (const n of [1, 5, 9]) {
      expect(grille().getByText(String(n))).toBeTruthy();
    }
    expect(grille().queryByText("10")).toBeNull();
    // Dernière page (6) : numéros 46 à 54, cases « à venir » comprises.
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Page suivante" }));
    }
    expect(grille().getByText("46")).toBeTruthy();
    expect(grille().getByText("54")).toBeTruthy();
  });

  it("les flèches de pagination n'ont ni cadre ni fond", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    for (const nom of ["Page précédente", "Page suivante"]) {
      const btn = screen.getByRole("button", {
        name: nom,
      }) as HTMLButtonElement;
      expect(btn.style.border).not.toContain("solid");
      expect(btn.style.background).toBe("transparent");
    }
  });

  it("les 9 cases partagent une boîte 3/4 que leur contenu ne peut pas agrandir", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    const grille = screen.getByTestId("page-classeur") as HTMLElement;
    expect(grille.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    const cases = Array.from(grille.children) as HTMLElement[];
    expect(cases).toHaveLength(9);
    for (const c of cases) {
      expect(c.style.aspectRatio).toBe("3 / 4");
      expect(c.style.minWidth).toBe("0px");
      expect(c.style.minHeight).toBe("0px");
      expect(c.style.overflow).toBe("hidden");
    }
    // Le visuel est sorti du flux : il ne pèse plus sur la taille de la case.
    const visuel = document.querySelector(
      '[data-testid="pochette"] [data-testid="piece-visuel"]',
    )?.parentElement as HTMLElement;
    expect(visuel.style.position).toBe("absolute");
  });
});

/* Le plafond de largeur de la grille soustrait le chrome de l'app (en-tête ET
   TabBar). Piège vu le 2026-08-31 : `100dvh - calc(a) + calc(b)` AJOUTAIT la
   TabBar (priorité des opérateurs) → grille trop large, débordement sous la
   TabBar sur les écrans courts. */
it("le plafond de largeur de la grille soustrait l'en-tête ET la TabBar", () => {
  render(<ClasseurOverlay open onClose={() => {}} />);
  const grille = screen.getByTestId("page-classeur") as HTMLElement;
  expect(grille.style.maxWidth).toContain("100dvh - (calc(var(--safe-top)");
  expect(grille.style.maxWidth).toContain(") - (calc(var(--mobile-tabbar-h)");
});

/* Le panneau est un calque SUR le bureau (comme les menus), pas une page :
   bureau visible et flouté derrière. */
it("le panneau laisse voir le bureau flouté derrière lui", () => {
  render(<ClasseurOverlay open onClose={() => {}} />);
  const dialog = screen.getByRole("dialog") as HTMLElement;
  expect(dialog.style.backdropFilter).toContain("blur(");
  expect(dialog.style.background).toMatch(/^rgba\(/);
});
