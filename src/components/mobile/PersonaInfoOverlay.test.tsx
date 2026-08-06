// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PersonaInfoOverlay, type PersonaInfo } from "./PersonaInfoOverlay";

afterEach(cleanup);

const info: PersonaInfo = {
  revelePersona: false,
  releveBourse: false,
  oeilAiguise: false,
};

describe("PersonaInfoOverlay", () => {
  it("le scrim force pointer-events: auto (l'overlay vit sous le topDecoration en pointer-events: none — sans ça, tous les clics traversent vers le scrim de la sheet et ferment la vente)", () => {
    render(<PersonaInfoOverlay info={info} onClose={() => {}} />);
    const scrim = screen.getByRole("presentation");
    expect(scrim.style.pointerEvents).toBe("auto");
  });

  it("clic sur la carte : ne ferme pas ; clic sur le scrim : ferme l'overlay", () => {
    const onClose = vi.fn();
    render(<PersonaInfoOverlay info={info} onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("presentation"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("PersonaInfoOverlay — goûts du client (Estimateur de bourse enrichi)", () => {
  it("affiche les catégories aimées et boudées quand la bourse est révélée", () => {
    const avecGouts: PersonaInfo = {
      revelePersona: false,
      releveBourse: true,
      oeilAiguise: false,
      bourse: 300,
      categoriesPreferees: ["Musique", "Mode"],
      categoriesEvitees: ["Bricolage"],
    };
    render(<PersonaInfoOverlay info={avecGouts} onClose={() => {}} />);
    expect(screen.getByText(/Aime : Musique, Mode/)).toBeTruthy();
    expect(screen.getByText(/Boude : Bricolage/)).toBeTruthy();
  });

  it("masque les lignes de goûts quand les listes sont vides", () => {
    const sansGouts: PersonaInfo = {
      revelePersona: false,
      releveBourse: true,
      oeilAiguise: false,
      bourse: 300,
      categoriesPreferees: [],
      categoriesEvitees: [],
    };
    render(<PersonaInfoOverlay info={sansGouts} onClose={() => {}} />);
    expect(screen.queryByText(/Aime :/)).toBeNull();
    expect(screen.queryByText(/Boude :/)).toBeNull();
  });
});
