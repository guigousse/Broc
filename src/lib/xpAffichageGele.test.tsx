// @vitest-environment jsdom
/**
 * Le gel d'affichage est un store de module : pensez à dégeler entre chaque
 * test, sinon l'état fuit d'un cas à l'autre.
 */
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { degelerXpAffichage, gelerXpAffichage, useXpAffiche } from "./xpAffichageGele";
import type { BrocanteurState } from "@/types/game";

afterEach(() => {
  degelerXpAffichage();
  cleanup();
});

function brocanteur(niveau: number, xp: number): BrocanteurState {
  return { niveau, xp, pointsDisponibles: 0 };
}

function Sonde({ reel }: { reel: BrocanteurState }) {
  const affiche = useXpAffiche(reel);
  return <span data-testid="valeur">{`N${affiche.niveau}-${affiche.xp}`}</span>;
}

describe("xpAffichageGele", () => {
  it("sans gel : la valeur réelle est affichée", () => {
    render(<Sonde reel={brocanteur(3, 120)} />);
    expect(screen.getByTestId("valeur").textContent).toBe("N3-120");
  });

  it("gelé : l'instantané est affiché même si le réel change", () => {
    const { rerender } = render(<Sonde reel={brocanteur(3, 120)} />);
    act(() => gelerXpAffichage(brocanteur(3, 120)));
    rerender(<Sonde reel={brocanteur(4, 260)} />);
    expect(screen.getByTestId("valeur").textContent).toBe("N3-120");
  });

  it("dégelé : la valeur réelle revient sans remonter le composant", () => {
    const { rerender } = render(<Sonde reel={brocanteur(3, 120)} />);
    act(() => gelerXpAffichage(brocanteur(3, 120)));
    rerender(<Sonde reel={brocanteur(4, 260)} />);
    act(() => degelerXpAffichage());
    expect(screen.getByTestId("valeur").textContent).toBe("N4-260");
  });

  it("dégeler sans gel actif ne casse rien", () => {
    render(<Sonde reel={brocanteur(1, 5)} />);
    act(() => degelerXpAffichage());
    expect(screen.getByTestId("valeur").textContent).toBe("N1-5");
  });
});
