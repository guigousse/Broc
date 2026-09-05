// @vitest-environment jsdom
/**
 * FichePiece — détail plein écran d'une pièce (carte/timbre).
 *
 * Refonte 2026-09-05 (retour Guillaume) : une CARTE porte déjà son nom, sa
 * catégorie, ses caractéristiques de duel sur son propre fond — la fiche ne
 * les répète plus (ni étoiles d'état, qui n'ont pas de sens pour une pièce,
 * ni thème, ni série, ni ligne de duel) et lui laisse la place : la carte
 * s'affiche en grand. Un timbre perd ses étoiles mais garde sa ligne
 * « Série », le thème ne se lit pas sur le timbre.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FichePiece } from "./FichePiece";
import { piecesDe } from "@/data/pieces";

afterEach(cleanup);

describe("FichePiece — une carte", () => {
  it("ne répète rien de ce que la carte porte déjà : ni étoiles, ni thème, ni série, ni caractéristiques", () => {
    const carte = piecesDe("classeur")[0];
    render(<FichePiece id={carte.id} quantite={1} onClose={() => {}} />);
    expect(screen.queryByTestId("etoiles-fiche")).toBeNull();
    expect(screen.queryByTestId("fiche-theme")).toBeNull();
    expect(screen.queryByText(/^Série :/)).toBeNull();
    expect(screen.queryByTestId("ligne-duel")).toBeNull();
    expect(screen.queryByText(/×1/)).toBeNull();
    // Le nom reste sur la plaque, et la carte elle-même est là.
    expect(screen.getByTestId("fiche-plaque").textContent).toBe(carte.nom);
    expect(screen.getByTestId("carte-duel")).toBeTruthy();
  });

  it("s'affiche en grand : la boîte du visuel prend la hauteur de l'écran, au format de la carte", () => {
    const carte = piecesDe("classeur")[0];
    render(<FichePiece id={carte.id} quantite={1} onClose={() => {}} />);
    const boite = screen.getByTestId("fiche-visuel");
    expect(boite.style.height).toBe("52vh");
    expect(boite.style.maxHeight).toBe("420px");
    expect(boite.style.aspectRatio).toBe("5 / 7");
  });

  it("plusieurs exemplaires : seul le ×N s'affiche sous la plaque", () => {
    const carte = piecesDe("classeur")[0];
    render(<FichePiece id={carte.id} quantite={3} onClose={() => {}} />);
    expect(screen.getByText("×3")).toBeTruthy();
    expect(screen.queryByText(/^Série :/)).toBeNull();
  });
});

describe("FichePiece — un timbre", () => {
  it("perd ses étoiles mais garde sa ligne Série, avec le ×N à partir du 2ᵉ exemplaire", () => {
    const timbre = piecesDe("timbres")[0];
    render(<FichePiece id={timbre.id} quantite={3} onClose={() => {}} />);
    expect(screen.queryByTestId("etoiles-fiche")).toBeNull();
    const ligne = screen.getByText(/^Série :/);
    expect(ligne.textContent).toContain("×3");
  });

  it("un seul exemplaire : la ligne Série sans ×N", () => {
    const timbre = piecesDe("timbres")[0];
    render(<FichePiece id={timbre.id} quantite={1} onClose={() => {}} />);
    expect(screen.getByText(/^Série :/)).toBeTruthy();
    expect(screen.queryByText(/×1/)).toBeNull();
  });
});
