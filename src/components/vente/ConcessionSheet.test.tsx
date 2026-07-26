// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConcessionSheet } from "./ConcessionSheet";
import { CAMIONS } from "@/data/camion";

afterEach(cleanup);

const ROGERS = CAMIONS[0]; // 9 places
const BREAK = CAMIONS[1]; // 16 places, 200 €

function poser(budget: number, onAcheter = vi.fn()) {
  render(
    <ConcessionSheet
      open
      onClose={() => {}}
      actuel={ROGERS}
      prochain={BREAK}
      budget={budget}
      onAcheter={onAcheter}
    />,
  );
  return onAcheter;
}

describe("ConcessionSheet", () => {
  it("montre le comparatif de capacité et le gain", () => {
    poser(500);
    expect(screen.getByText("9 places")).toBeTruthy();
    expect(screen.getByText("16 places")).toBeTruthy();
    expect(screen.getByText("+7 places")).toBeTruthy();
  });

  it("au budget exact : bouton actif, achat transmis", () => {
    const onAcheter = poser(200);
    const bouton = screen.getByRole("button", { name: "Acheter · 200 €" });
    expect(bouton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(bouton);
    expect(onAcheter).toHaveBeenCalledTimes(1);
  });

  it("sous le prix : bouton bloqué et somme manquante annoncée", () => {
    const onAcheter = poser(160);
    const bouton = screen.getByRole("button", { name: "Acheter · 200 €" });
    expect(bouton.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Il vous manque 40 €")).toBeTruthy();
    fireEvent.click(bouton);
    expect(onAcheter).not.toHaveBeenCalled();
  });

  it("fermée : ne rend pas son contenu", () => {
    render(
      <ConcessionSheet
        open={false}
        onClose={() => {}}
        actuel={ROGERS}
        prochain={BREAK}
        budget={500}
        onAcheter={() => {}}
      />,
    );
    expect(screen.queryByText("+7 places")).toBeNull();
  });
});
