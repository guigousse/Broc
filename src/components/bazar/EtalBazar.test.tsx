// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EtalBazarVue } from "@/components/bazar/EtalBazar";
import { genererEtal } from "@/lib/bazar/etal";

afterEach(cleanup);

/**
 * RNG déterministe (même convention que `etal.test.ts`) : `genererEtal` sans
 * rng retombe sur `Math.random`, ce qui rendait ce test intermittent — le
 * prix de vitrine tiré au hasard pouvait contenir le chiffre « 5 » et
 * collisionner avec « 5 pièces », toujours présent dans les lots.
 */
function rngFixe(suite: number[]): () => number {
  let i = 0;
  return () => suite[i++ % suite.length];
}

const etal = genererEtal("2026-W34", rngFixe([0.1, 0.4, 0.7, 0.2]));

describe("EtalBazarVue", () => {
  it("affiche le titre de l'écran — on arrive ici par une porte, rien d'autre ne dit où l'on est", () => {
    render(<EtalBazarVue etal={etal} jetons={20} onAcheter={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: "Le Bazar" })).toBeTruthy();
  });

  it("montre les trois lots de pièces et la vitrine", () => {
    render(<EtalBazarVue etal={etal} jetons={20} onAcheter={() => {}} />);
    expect(screen.getAllByRole("button", { name: /pièces/i })).toHaveLength(3);
    // Ancré sur « — N » : un chiffre nu collisionnerait avec « 5 pièces »,
    // présent dans chaque lot (PIECES_PAR_LOT = 5).
    expect(
      screen.getByRole("button", { name: new RegExp(`— ${etal.vitrine!.prix}\\s`) }),
    ).toBeTruthy();
  });

  it("grise ce que le joueur ne peut pas payer", () => {
    render(<EtalBazarVue etal={etal} jetons={0} onAcheter={() => {}} />);
    for (const b of screen.getAllByRole("button"))
      expect((b as HTMLButtonElement).disabled).toBe(true);
  });

  it("remonte l'achat d'un lot avec son index", async () => {
    const onAcheter = vi.fn();
    render(<EtalBazarVue etal={etal} jetons={20} onAcheter={onAcheter} />);
    await userEvent.click(screen.getAllByRole("button", { name: /pièces/i })[1]);
    expect(onAcheter).toHaveBeenCalledWith({ type: "pieces", index: 1 });
  });

  it("annonce la vitrine vide plutôt qu'un bouton mort", () => {
    render(<EtalBazarVue etal={{ ...etal, vitrine: null }} jetons={20} onAcheter={() => {}} />);
    expect(screen.getByText(/vendu/i)).toBeTruthy();
  });
});
