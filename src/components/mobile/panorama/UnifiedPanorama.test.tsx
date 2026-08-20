// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { UnifiedPanorama, ZONES_BUREAU } from "./UnifiedPanorama";

afterEach(cleanup);

// Pas de LangueProvider : `useLangue` lit un contexte qui a une valeur par
// défaut (fr). C'est la convention de tous les tests de composants du dépôt,
// cf. `EtalBazar.test.tsx`.

describe("UnifiedPanorama", () => {
  it("garde le décor du bureau quand on ne lui passe rien", () => {
    const { container } = render(<UnifiedPanorama />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/qg/fond-cabinet.webp");
    const ancres = [...container.querySelectorAll("[data-unified-zone]")].map((n) =>
      n.getAttribute("data-unified-zone"),
    );
    expect(ancres).toEqual(["bureau", "porte", "repos"]);
  });

  it("accepte un autre décor et d'autres zones", () => {
    const { container } = render(
      <UnifiedPanorama
        image="/bazar/fond-bazar.webp"
        aspect={{ w: 2752, h: 1536 }}
        zones={[
          { key: "arcade", center: 1 / 6 },
          { key: "comptoir", center: 1 / 2 },
          { key: "antiquites", center: 5 / 6 },
        ]}
        ariaLabel="Panorama du Bazar"
      />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/bazar/fond-bazar.webp");
    const ancres = [...container.querySelectorAll("[data-unified-zone]")].map((n) =>
      n.getAttribute("data-unified-zone"),
    );
    expect(ancres).toEqual(["arcade", "comptoir", "antiquites"]);
    expect(screen.getByLabelText("Panorama du Bazar")).toBeTruthy();
  });

  it("les centres de zone restent des tiers", () => {
    expect(ZONES_BUREAU.map((z) => z.center)).toEqual([1 / 6, 1 / 2, 5 / 6]);
  });
});
