import { describe, expect, it } from "vitest";
import { policeCss, texteCouche } from "./overlay.js";

describe("policeCss", () => {
  it("graisse, taille, famille — Verve Shadow sans graisse, Système = police du téléphone", () => {
    expect(policeCss({ police: "Cinzel", taille: 64, gras: true })).toBe("600 64px 'Cinzel'");
    expect(policeCss({ police: "Cinzel", taille: 40, gras: false })).toBe("40px 'Cinzel'");
    expect(policeCss({ police: "Verve Shadow", taille: 200, gras: true })).toBe("200px 'Verve Shadow'");
    expect(policeCss({ police: "Système", taille: 30, gras: true })).toBe("600 30px -apple-system, system-ui, sans-serif");
  });
});

describe("texteCouche", () => {
  it("remplace {n}", () => expect(texteCouche({ texte: "+ {n} objets" }, 391)).toBe("+ 391 objets"));
});
