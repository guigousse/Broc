// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ItemSticker } from "./ItemSticker";

afterEach(cleanup);

describe("ItemSticker", () => {
  it("rend l'image de l'item quand le templateId est connu", () => {
    const { container } = render(
      <ItemSticker templateId="br.scie_egoine_de_charpentier" categorie="Bricolage" />,
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toContain("/items/br.scie_egoine_de_charpentier.webp");
  });

  it("rend un fallback CategorieIcon quand le templateId n'a pas d'image", () => {
    const { container } = render(
      <ItemSticker templateId="legacy" categorie="Bricolage" />,
    );
    const img = container.querySelector("img");
    expect(img).toBeFalsy();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("charge en lazy par défaut", () => {
    const { container } = render(
      <ItemSticker templateId="br.scie_egoine_de_charpentier" categorie="Bricolage" />,
    );
    expect(container.querySelector("img")?.getAttribute("loading")).toBe("lazy");
  });

  it("charge en eager quand eager=true", () => {
    const { container } = render(
      <ItemSticker
        templateId="br.scie_egoine_de_charpentier"
        categorie="Bricolage"
        eager
      />,
    );
    expect(container.querySelector("img")?.getAttribute("loading")).toBe("eager");
  });

  // ── Ancrage vertical : demandé le 2026-08-20, après la vignette du Bazar ──
  // `object-fit: contain` letterboxe un objet large et bas (une ménagère, une
  // pile de vinyles) : sans ancrer le bas, le vide laissé sous lui le fait
  // FLOTTER au-dessus de la planche du Bazar au lieu d'y reposer. C'est le
  // défaut corrigé le matin même sur `ItemImage`, que le passage au sticker
  // avait réintroduit. jsdom n'a pas de layout : seul le style en ligne peut
  // en témoigner.
  describe("ancrage vertical", () => {
    // CE test-ci est celui qui protège le reste du jeu : la collection, les
    // cartes, le stockage et la fiche de détail passent tous par ce composant
    // sans rien demander, et doivent rester centrés.
    it("par défaut, rien ne change : image centrée, boîte centrée", () => {
      const { container } = render(
        <ItemSticker templateId="br.scie_egoine_de_charpentier" categorie="Bricolage" fill />,
      );
      const img = container.querySelector("img") as HTMLImageElement;
      expect(img.style.objectPosition).toBe("center");
      const wrap = container.firstElementChild as HTMLElement;
      expect(wrap.style.alignItems).toBe("center");
    });

    it("verticalAlign=\"bottom\" : l'image est ancrée sur l'arête basse (object-position)", () => {
      const { container } = render(
        <ItemSticker
          templateId="br.scie_egoine_de_charpentier"
          categorie="Bricolage"
          fill
          verticalAlign="bottom"
        />,
      );
      const img = container.querySelector("img") as HTMLImageElement;
      expect(img.style.objectPosition).toBe("center bottom");
    });

    // Hors `fill`, l'image est DANS le flux et sa boîte épouse déjà l'image :
    // `object-position` n'y ancre rien, seul l'alignement du conteneur la
    // pose au bas. Les deux réglages sont posés ensemble, chacun servant dans
    // son mode — sans quoi la prop mentirait dans la moitié des cas.
    it("verticalAlign=\"bottom\" justifie AUSSI la boîte en bas, pour le mode hors `fill`", () => {
      const { container } = render(
        <ItemSticker
          templateId="br.scie_egoine_de_charpentier"
          categorie="Bricolage"
          verticalAlign="bottom"
        />,
      );
      const wrap = container.firstElementChild as HTMLElement;
      expect(wrap.style.alignItems).toBe("flex-end");
    });
  });
});
