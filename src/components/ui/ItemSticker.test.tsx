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
});
