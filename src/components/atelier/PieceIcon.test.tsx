// @vitest-environment jsdom
/**
 * « L'objet doit toujours être visible en entier » — recette du 2026-08-20 sur
 * téléphone. Le Bazar pose l'engrenage d'un lot dans une case CARRÉE dont la
 * largeur suit l'écran ; une taille en pixels ne peut pas y promettre « ça
 * tient ». La case ne rogne plus rien : c'est donc à l'icône de ne jamais
 * dépasser.
 *
 * jsdom n'a pas de moteur de layout : seul le style en ligne peut en témoigner.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PieceIcon } from "./PieceIcon";

afterEach(cleanup);

describe("PieceIcon", () => {
  it("ne dépasse jamais sa boîte, quelle que soit la taille demandée", () => {
    const { container } = render(<PieceIcon categorie="Musique" size={480} />);
    const boite = container.firstElementChild as HTMLElement;
    expect(boite.style.maxWidth).toBe("100%");
    expect(boite.style.maxHeight).toBe("100%");
  });

  it("le dessin suit la boîte, il ne garde pas la taille demandée en dur", () => {
    // Sans ça, le plafond raboterait le conteneur pendant que l'engrenage,
    // dimensionné par l'attribut `width`/`height` que lucide pose à partir de
    // `size`, continuerait d'en sortir.
    const { container } = render(<PieceIcon categorie="Musique" size={48} />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe("100%");
    expect(svg.style.height).toBe("100%");
  });

  it("garde la taille demandée comme taille souhaitée", () => {
    const { container } = render(<PieceIcon categorie="Musique" size={48} />);
    const boite = container.firstElementChild as HTMLElement;
    expect(boite.style.width).toBe("48px");
    expect(boite.style.height).toBe("48px");
  });

  it("affiche le badge de quantité quand `count` est fourni", () => {
    const { container } = render(
      <PieceIcon categorie="Musique" size={48} count={5} />,
    );
    expect(container.textContent).toBe("5");
  });
});
