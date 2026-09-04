import { describe, expect, it } from "vitest";
import { pieceImageSrc, PIECES_AVEC_IMAGE } from "@/lib/pieceImages";

describe("pieceImageSrc", () => {
  it("null tant que le fichier n'est pas déclaré", () => {
    // Une pièce non déclarée, carte ou timbre, n'a pas de chemin ; un objet
    // qui n'est pas une pièce non plus.
    expect(pieceImageSrc("carte.marteau_menuisier", new Set())).toBeNull();
    expect(pieceImageSrc("timbre.renard_roux", new Set())).toBeNull();
    expect(pieceImageSrc("br.marteau_menuisier")).toBeNull();
  });
  it("chemin par album pour un id déclaré", () => {
    const set = new Set([...PIECES_AVEC_IMAGE, "carte.marteau_menuisier"]);
    expect(pieceImageSrc("timbre.renard_roux", set)).toBe("/timbres/timbre.renard_roux.webp");
    expect(pieceImageSrc("carte.marteau_menuisier", set)).toBe("/cartes/carte.marteau_menuisier.webp");
  });
  it("les 50 cartes sont déclarées (art livré 2026-09-04)", () => {
    expect(
      [...PIECES_AVEC_IMAGE].filter((id) => id.startsWith("carte.")),
    ).toHaveLength(50);
  });
  it("les 50 timbres sont déclarés (art livré 2026-09-02)", () => {
    expect(
      [...PIECES_AVEC_IMAGE].filter((id) => id.startsWith("timbre.")),
    ).toHaveLength(50);
  });
});
