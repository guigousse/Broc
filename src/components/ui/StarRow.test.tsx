// @vitest-environment jsdom
/**
 * L'ÉCLAT DU PRISTIN.
 *
 * Trois étoiles sur trois, c'est le sommet de l'échelle d'état
 * (`ETAT_STARS["Pristin état"] === 3`). Ces étoiles-là brillent : la teinte
 * de rareté reste, mais montée en éclat et entourée de son propre halo —
 * demande de l'auteur, 2026-08-26. La règle vit ICI et non chez les six
 * appelants : un objet pristin doit briller partout où il se montre
 * (stockage, collection, atelier, cartes, coffre), sans qu'on ait à y penser
 * à chaque nouvel écran.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { StarRow } from "./StarRow";

afterEach(cleanup);

function etoiles(container: HTMLElement): SVGSVGElement[] {
  return Array.from(container.querySelectorAll("svg"));
}

describe("StarRow — l'éclat du pristin", () => {
  it("trois étoiles sur trois : teinte montée en éclat et halo de la même couleur", () => {
    const { container } = render(<StarRow filled={3} color="rgb(180, 83, 9)" />);
    for (const e of etoiles(container)) {
      expect(e.style.filter).toContain("brightness(");
      // Deux halos : un serré qui appuie la forme, un large qui la fait rayonner.
      expect(e.style.filter.match(/drop-shadow\(0 0 /g)?.length).toBe(2);
      expect(e.style.filter).toContain("rgb(180, 83, 9)");
    }
  });

  it("deux étoiles sur trois : aucun éclat, l'objet n'est pas au sommet", () => {
    const { container } = render(<StarRow filled={2} color="rgb(180, 83, 9)" />);
    for (const e of etoiles(container)) {
      expect(e.style.filter ?? "").not.toContain("brightness(");
    }
  });

  it("l'ombre de lisibilité survit à l'éclat : les deux se composent", () => {
    const { container } = render(
      <StarRow filled={3} color="rgb(180, 83, 9)" dropShadow />,
    );
    const f = etoiles(container)[0].style.filter;
    expect(f).toContain("rgba(0,0,0,0.5)");
    expect(f).toContain("brightness(");
  });

  it("une rangée VIDE ne brille pas, même si le total est nul", () => {
    const { container } = render(<StarRow filled={0} color="rgb(180, 83, 9)" total={0} />);
    expect(etoiles(container)).toHaveLength(0);
  });
});
