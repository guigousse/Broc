// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ItemVignetteKraft } from "./ItemVignetteKraft";

afterEach(cleanup);

describe("ItemVignetteKraft", () => {
  it("rend l'image de l'item quand le templateId est connu", () => {
    const { container } = render(
      <ItemVignetteKraft templateId="br.scie_egoine_stanley" categorie="Bricolage" />,
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toContain("/items/br.scie_egoine_stanley.webp");
  });

  it("rend un fallback CategorieIcon quand le templateId n'a pas d'image", () => {
    const { container } = render(
      <ItemVignetteKraft templateId="legacy" categorie="Bricolage" />,
    );
    const img = container.querySelector("img");
    expect(img).toBeFalsy();
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
