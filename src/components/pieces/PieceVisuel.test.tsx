// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PieceVisuel } from "./PieceVisuel";

// Depuis le 2026-09-04 les 50 cartes ont leur art : pour tester le repli
// « objet source toonifié », on retire le marteau de la liste déclarée.
vi.mock("@/lib/pieceImages", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/pieceImages")>();
  const sans = new Set([...mod.PIECES_AVEC_IMAGE].filter((id) => id !== "carte.marteau_menuisier"));
  return { ...mod, pieceImageSrc: (id: string, declarees: ReadonlySet<string> = sans) => mod.pieceImageSrc(id, declarees) };
});


afterEach(cleanup);

describe("PieceVisuel", () => {
  it("une carte sans art montre l'objet source dans un cadre", () => {
    const { container } = render(<PieceVisuel id="carte.marteau_menuisier" size={96} />);
    const v = container.querySelector('[data-testid="piece-visuel"]') as HTMLElement;
    expect(v.dataset.pieceSource).toBe("placeholder");
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toContain("br.marteau_menuisier");
    expect(v.style.width).toBe("96px");
  });
  // Depuis le 2026-09-02, les 50 timbres ont leur art : le SVG dentelé de
  // secours ne sert plus qu'à un id qui perdrait son fichier.
  it("un timbre avec art montre son webp de public/timbres/", () => {
    const { container } = render(<PieceVisuel id="timbre.renard_roux" size={64} />);
    const v = container.querySelector('[data-testid="piece-visuel"]') as HTMLElement;
    expect(v.dataset.pieceSource).toBe("image");
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/timbres/timbre.renard_roux.webp");
  });
  it("grisé : filtre gris", () => {
    const { container } = render(<PieceVisuel id="timbre.renard_roux" size={64} grise />);
    const v = container.querySelector('[data-testid="piece-visuel"]') as HTMLElement;
    expect(v.style.filter).toContain("grayscale");
  });
  it("thumb : une carte sans art charge la vignette de l'objet source, pas le plein format", () => {
    const { container } = render(<PieceVisuel id="carte.marteau_menuisier" size={96} thumb />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toContain("/thumbs/");
    expect(img.getAttribute("src")).toContain("br.marteau_menuisier");
  });
});
