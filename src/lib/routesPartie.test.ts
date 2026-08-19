import { describe, expect, it } from "vitest";
import { estRoutePartie } from "./routesPartie";

describe("estRoutePartie", () => {
  it("reconnaît /bazar comme route de partie — le chrome global (level-up, bannière tuto) doit s'y afficher", () => {
    expect(estRoutePartie("/bazar")).toBe(true);
    expect(estRoutePartie("/bazar/quoi-que-ce-soit")).toBe(true);
  });

  it("ignore les écrans hors partie (menu, mentions légales…)", () => {
    expect(estRoutePartie("/")).toBe(false);
    expect(estRoutePartie(null)).toBe(false);
  });
});
