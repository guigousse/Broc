// @vitest-environment jsdom
/**
 * FichePiece — détail plein écran d'une pièce (carte/timbre).
 *
 * I5 revue finale 2026-08-30 : la ligne « Série : … » ne s'affichait qu'à
 * partir du 2ᵉ exemplaire (`quantite > 1`) alors qu'elle porte le thème/la
 * catégorie de la pièce, pas le doublon — elle doit être visible dès le 1er
 * exemplaire, et ×N ne s'y ajoute qu'à partir du 2ᵉ.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FichePiece } from "./FichePiece";
import { piecesDe } from "@/data/pieces";

afterEach(cleanup);

describe("FichePiece", () => {
  it("un seul exemplaire : la ligne Série s'affiche déjà, sans ×N", () => {
    const carte = piecesDe("classeur")[0];
    render(<FichePiece id={carte.id} quantite={1} onClose={() => {}} />);
    expect(screen.getByText(/^Série :/)).toBeTruthy();
    expect(screen.queryByText(/×1/)).toBeNull();
  });

  it("plusieurs exemplaires : la ligne Série porte aussi le ×N", () => {
    const timbre = piecesDe("timbres")[0];
    render(<FichePiece id={timbre.id} quantite={3} onClose={() => {}} />);
    const ligne = screen.getByText(/^Série :/);
    expect(ligne.textContent).toContain("×3");
  });
});
