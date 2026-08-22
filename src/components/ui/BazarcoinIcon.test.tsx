// @vitest-environment jsdom
/**
 * Le Bazarcoin. Depuis le dessin arrêté par l'auteur le 2026-08-22, ce n'est
 * plus une pièce mais un SIGNE MONÉTAIRE — un Z barré à la manière de l'euro,
 * sans flan autour. Il se comporte donc comme un caractère : il se dimensionne
 * en HAUTEUR, pour s'asseoir à côté d'un nombre.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { BazarcoinIcon } from "./BazarcoinIcon";

afterEach(cleanup);

describe("BazarcoinIcon", () => {
  /**
   * Un signe plus haut que large : c'est la HAUTEUR qu'on demande, la largeur
   * suit. Le contraire — un carré — reviendrait à ce qu'il vivait quand il
   * avait un flan rond, et rendrait le glyphe minuscule au milieu d'un cadre
   * vide.
   */
  it("se dimensionne en hauteur, la largeur suit le dessin", () => {
    const { container } = render(<BazarcoinIcon size={20} />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("height")).toBe("20");
    expect(Number(svg.getAttribute("width"))).toBeCloseTo(20 * 0.7526, 1);
  });

  /**
   * Le cadre épouse le signe. Le dessin a été composé dans un repère de 24×24
   * qui contenait aussi un flan ; le flan retiré, garder ce repère laisserait
   * un tiers de vide autour et le signe ne ferait plus que 9 px de haut là où
   * on en demande 14.
   */
  it("resserre son cadre sur le signe, sans vide autour", () => {
    const { container } = render(<BazarcoinIcon />);
    const vb = (container.querySelector("svg") as SVGElement).getAttribute("viewBox")!;
    const [, , w, h] = vb.split(/\s+/).map(Number);
    expect(vb).not.toBe("0 0 24 24");
    expect(w / h).toBeCloseTo(0.7526, 3);
  });

  it("est décoratif — c'est son étiquette qui le nomme", () => {
    const { container } = render(<BazarcoinIcon />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.querySelector("title")).toBeNull();
  });

  /**
   * La caisse porte les deux devises sous un même libellé, et tout le reste
   * du jeu est en laiton : c'est la couleur, et elle seule, qui dit laquelle
   * on lit. `azur-400` a été ajouté au nuancier pour ça — mesuré 4,8:1 sur le
   * vert des plaques et 6,1:1 sur celui du bandeau, au-dessus d'AA sur les
   * deux fonds où il vit.
   */
  it("se peint en bleu électrique, pour ne pas se confondre avec le laiton des euros", () => {
    const { container } = render(<BazarcoinIcon />);
    const trait = container.querySelector("path") as SVGElement;
    expect(trait.getAttribute("stroke")).toBe("var(--azur-400)");
    expect(trait.getAttribute("fill")).toBe("none");
  });

  /**
   * Le bleu du bandeau et des plaques est calibré pour le vert sombre : sur le
   * papier crème de la fiche d'un article il ne mesure que 2,6:1 et devient
   * illisible. `surClair` bascule sur la teinte profonde du nuancier, à 6,3:1
   * sur ce même papier.
   */
  it("sur fond clair, il prend la teinte profonde — l'autre y serait illisible", () => {
    const { container } = render(<BazarcoinIcon surClair />);
    const trait = container.querySelector("path") as SVGElement;
    expect(trait.getAttribute("stroke")).toBe("var(--azur-600)");
  });

  /**
   * Les plaques de prix s'éteignent d'un bloc quand l'article passe hors de
   * portée de la bourse — fond, filet et texte ensemble (cf. `etiquette.ts`).
   * Un signe rouge vif resterait allumé au milieu d'une plaque éteinte.
   */
  it("terni, il passe au nuancier éteint des plaques hors de portée", () => {
    const { container } = render(<BazarcoinIcon terni />);
    const trait = container.querySelector("path") as SVGElement;
    expect(trait.getAttribute("stroke")).toBe("var(--paper-400)");
  });
});
