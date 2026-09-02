import { describe, expect, it } from "vitest";
import { pieceImageSrc, PIECES_AVEC_IMAGE } from "@/lib/pieceImages";

describe("pieceImageSrc", () => {
  it("null tant que le fichier n'est pas déclaré", () => {
    // Les cartes n'ont pas encore leur art ; un timbre non déclaré non plus.
    expect(pieceImageSrc("carte.marteau_menuisier")).toBeNull();
    expect(pieceImageSrc("timbre.renard_roux", new Set())).toBeNull();
    expect(pieceImageSrc("br.marteau_menuisier")).toBeNull();
  });
  it("chemin par album pour un id déclaré", () => {
    const set = new Set([...PIECES_AVEC_IMAGE, "carte.marteau_menuisier"]);
    expect(pieceImageSrc("timbre.renard_roux", set)).toBe("/timbres/timbre.renard_roux.webp");
    expect(pieceImageSrc("carte.marteau_menuisier", set)).toBe("/cartes/carte.marteau_menuisier.webp");
  });
  it("les 50 timbres sont déclarés (art livré 2026-09-02)", () => {
    expect(
      [...PIECES_AVEC_IMAGE].filter((id) => id.startsWith("timbre.")),
    ).toHaveLength(50);
  });
});
