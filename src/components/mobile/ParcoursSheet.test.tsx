// @vitest-environment jsdom
/**
 * `ParcoursSheet` — panneau « Parcours » listant tous les déblocages par
 * niveau (clarté de progression, 2026-07-06). Pur composant de présentation :
 * pas de contexte à mocker.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ParcoursSheet } from "./ParcoursSheet";

afterEach(cleanup);

describe("ParcoursSheet", () => {
  it("fermé : ne rend rien", () => {
    const { container } = render(
      <ParcoursSheet open={false} onClose={vi.fn()} niveau={8} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("ouvert au niveau 8 : N8 et en-dessous atteints, N9 mis en avant", () => {
    render(<ParcoursSheet open onClose={vi.fn()} niveau={8} />);

    const rowN7 = screen.getByTestId("parcours-row-7");
    expect(rowN7.getAttribute("data-etat")).toBe("atteint");

    const rowN9 = screen.getByTestId("parcours-row-9");
    expect(rowN9.getAttribute("data-etat")).toBe("prochain");

    // Deux déblocages au niveau 10 (brocantes T3 + paliers 2 des compétences).
    const rowsN10 = screen.getAllByTestId("parcours-row-10");
    expect(rowsN10.length).toBe(2);
    for (const r of rowsN10) expect(r.getAttribute("data-etat")).toBe("a-venir");

    // Une seule ligne "prochain" dans toute la liste.
    const toutesLesLignes = screen.getAllByTestId(/^parcours-row-/);
    const prochains = toutesLesLignes.filter(
      (el) => el.getAttribute("data-etat") === "prochain",
    );
    expect(prochains).toHaveLength(1);

  });

  it("affiche le niveau courant et la note sur les points de compétence", () => {
    render(<ParcoursSheet open onClose={vi.fn()} niveau={3} />);
    expect(screen.getByText("Niveau 3")).toBeTruthy();
    expect(
      screen.getByText(/Chaque niveau : \+1 point de compétence/),
    ).toBeTruthy();
  });
});
