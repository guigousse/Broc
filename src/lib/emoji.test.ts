import { describe, expect, it } from "vitest";
import { extraireEmoji } from "./emoji";

describe("extraireEmoji", () => {
  it("sépare le premier emoji et nettoie le titre", () => {
    expect(extraireEmoji("Atout 🔍 Le Flair")).toEqual({ emoji: "🔍", texte: "Atout Le Flair" });
  });
  it("titre sans emoji : texte intact, emoji null", () => {
    expect(extraireEmoji("Paliers 2 des compétences")).toEqual({ emoji: null, texte: "Paliers 2 des compétences" });
  });
});
