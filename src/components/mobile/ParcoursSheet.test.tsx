// @vitest-environment jsdom
/**
 * `ParcoursSheet` — panneau « Parcours » listant tous les déblocages par
 * niveau (clarté de progression, 2026-07-06). Pur composant de présentation :
 * pas de contexte à mocker.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParcoursSheet } from "./ParcoursSheet";

afterEach(cleanup);

describe("ParcoursSheet", () => {
  it("fermé : ne rend rien", () => {
    const { container } = render(
      <ParcoursSheet open={false} onClose={vi.fn()} niveau={8} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("ouvert au niveau 8 : niveaux ≤ 8 atteints, groupe N10 mis en avant", () => {
    render(<ParcoursSheet open onClose={vi.fn()} niveau={8} />);

    const rowN5 = screen.getByTestId("parcours-row-5");
    expect(rowN5.getAttribute("data-etat")).toBe("atteint");

    // Prochain niveau après 8 = 10 (paliers 2 + Lot garni : 2 lignes,
    // toutes marquées « prochain » — une seule pastille dans la timeline).
    const rowsN10 = screen.getAllByTestId("parcours-row-10");
    expect(rowsN10.length).toBe(2);
    for (const r of rowsN10) expect(r.getAttribute("data-etat")).toBe("prochain");

    const rowN15 = screen.getByTestId("parcours-row-15");
    expect(rowN15.getAttribute("data-etat")).toBe("a-venir");
  });

  it("affiche le niveau courant et la note sur les points de compétence", () => {
    render(<ParcoursSheet open onClose={vi.fn()} niveau={3} />);
    expect(screen.getByText("Niveau 3")).toBeTruthy();
    expect(
      screen.getByText(/Chaque niveau : \+1 point de compétence/),
    ).toBeTruthy();
  });
});

describe("ParcoursSheet — fiche de déblocage", () => {
  it("tap sur une ligne → fiche avec description et statut débloqué", async () => {
    const user = userEvent.setup();
    render(<ParcoursSheet open onClose={vi.fn()} niveau={6} />);
    await user.click(screen.getByTestId("parcours-row-5")); // Le Flair (N5, atteint)
    expect(screen.getByText(/révèle la cote/)).toBeTruthy();
    expect(screen.getByText("Débloqué ✓")).toBeTruthy();
  });

  it("déblocage futur → statut À venir, fermeture par ✕", async () => {
    const user = userEvent.setup();
    render(<ParcoursSheet open onClose={vi.fn()} niveau={6} />);
    await user.click(screen.getAllByTestId("parcours-row-30")[0]); // Paliers 3 + Criée (N30)
    expect(screen.getByText("À venir")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Fermer la fiche" }));
    expect(screen.queryByText("À venir")).toBeNull();
  });
});
