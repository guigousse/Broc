import { describe, expect, it } from "vitest";
import { ROUE, domine, proieDe } from "@/data/duel/roue";

describe("roue des catégories", () => {
  it("a 7 crans, chaque catégorie une fois", () => {
    expect(ROUE).toHaveLength(7);
    expect(new Set(ROUE).size).toBe(7);
  });

  it("Bricolage casse Maison, Objets d'art humilie Bricolage (la roue se referme)", () => {
    expect(proieDe("Bricolage")).toBe("Maison");
    expect(proieDe("Objets d'art")).toBe("Bricolage");
    expect(domine("Bricolage", "Maison")).toBe(true);
    expect(domine("Maison", "Bricolage")).toBe(false);
    expect(domine("Maison", "Maison")).toBe(false);
  });

  it("suit l'ordre de la spec", () => {
    expect(ROUE).toEqual([
      "Bricolage", "Maison", "Mode", "Musique", "Livres & Papeterie", "Jeux & Loisirs", "Objets d'art",
    ]);
  });
});
