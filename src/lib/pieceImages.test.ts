import { describe, expect, it } from "vitest";
import { pieceImageSrc, PIECES_AVEC_IMAGE } from "@/lib/pieceImages";

describe("pieceImageSrc", () => {
  it("null tant que le fichier n'est pas déclaré", () => {
    expect(pieceImageSrc("timbre.renard_roux")).toBeNull();
    expect(pieceImageSrc("br.marteau_menuisier")).toBeNull();
  });
  it("chemin par album pour un id déclaré", () => {
    const set = new Set([...PIECES_AVEC_IMAGE, "timbre.renard_roux", "carte.marteau_menuisier"]);
    expect(pieceImageSrc("timbre.renard_roux", set)).toBe("/timbres/timbre.renard_roux.webp");
    expect(pieceImageSrc("carte.marteau_menuisier", set)).toBe("/cartes/carte.marteau_menuisier.webp");
  });
});
