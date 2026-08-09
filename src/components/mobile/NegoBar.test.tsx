// @vitest-environment jsdom
/**
 * Pastille « achat » de la barre de négociation (vente) : repère fixe non
 * interactif à la position du prix d'achat, comme sur le PrixSlider de la
 * tarification. Absente quand la prop n'est pas fournie (mode chine) ou
 * vaut null (panier dont un objet n'a pas de prix d'achat connu).
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NegoBar } from "./NegoBar";

afterEach(cleanup);

function renderBar(achat?: number | null) {
  return render(
    <NegoBar
      mode="vente"
      echelleMax={100}
      prixAdverse={40}
      prixJoueur={80}
      minJoueur={40}
      maxJoueur={100}
      onChangeJoueur={() => {}}
      achat={achat}
    />,
  );
}

describe("NegoBar — pastille achat", () => {
  it("affiche le repère fixe au prix d'achat quand la prop est fournie", () => {
    renderBar(10);
    expect(screen.getByText("10€")).toBeTruthy();
    expect(screen.getByText("achat")).toBeTruthy();
  });

  it("n'affiche rien sans prix d'achat (prop absente ou null)", () => {
    renderBar();
    expect(screen.queryByText("achat")).toBeNull();
    cleanup();
    renderBar(null);
    expect(screen.queryByText("achat")).toBeNull();
  });

  it("n'affiche rien pour un prix d'achat de 0 (objet du colis)", () => {
    renderBar(0);
    expect(screen.queryByText("achat")).toBeNull();
  });
});
