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
    expect(dialog.style.bottom).toBe("calc(var(--mobile-tabbar-h) + var(--safe-bottom))");
    expect(dialog.style.left).toBe("0px");
    expect(dialog.style.right).toBe("0px");
    expect(dialog.style.overflowY).not.toBe("auto");
    expect(dialog.style.border).toBe("");
  });

  it("le titre est seul sur sa ligne, centré, juste sous l'en-tête", () => {
    render(<ClasseurOverlay open onClose={() => {}} />);
    const dialog = screen.getByRole("dialog") as HTMLElement;
    const titre = screen.getByText("Classeur de cartes") as HTMLElement;
    const ligne = titre.parentElement as HTMLElement;
    expect(ligne.style.justifyContent).toBe("center");
    expect(ligne.children).toHaveLength(1);
    // Première ligne du panneau : rien au-dessus du titre.
    expect(dialog.firstElementChild).toBe(ligne);
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
    const visuel = document.querySelector('[data-testid="pochette"] [data-testid="piece-visuel"]')
      ?.parentElement as HTMLElement;
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
