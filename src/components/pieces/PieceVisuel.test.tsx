// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PieceVisuel } from "./PieceVisuel";

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
  it("un timbre sans art montre un SVG dentelé numéroté", () => {
    const { container } = render(<PieceVisuel id="timbre.renard_roux" size={64} />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.textContent).toContain("11"); // ordre 10 → n° 11
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
