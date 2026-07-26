// @vitest-environment jsdom
/**
 * Le gel d'affichage est un store de module : pensez à dégeler entre chaque
 * test, sinon l'état fuit d'un cas à l'autre.
 */
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  degelerBudgetAffichage,
  degelerXpAffichage,
  gelerBudgetAffichage,
  gelerXpAffichage,
  poserSupplementBudget,
  useBudgetAffiche,
  useXpAffiche,
} from "./affichageGele";
import type { BrocanteurState } from "@/types/game";

afterEach(() => {
  degelerXpAffichage();
  degelerBudgetAffichage();
  cleanup();
});

function brocanteur(niveau: number, xp: number): BrocanteurState {
  return { niveau, xp, pointsDisponibles: 0 };
}

function Sonde({ reel }: { reel: BrocanteurState }) {
  const affiche = useXpAffiche(reel);
  return <span data-testid="valeur">{`N${affiche.niveau}-${affiche.xp}`}</span>;
}

describe("affichageGele — barre XP", () => {
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

function SondeCaisse({ reel }: { reel: number }) {
  return <span data-testid="caisse">{useBudgetAffiche(reel)}</span>;
}

const caisse = () => screen.getByTestId("caisse").textContent;

describe("affichageGele — caisse", () => {
  it("sans gel : le solde réel est affiché", () => {
    render(<SondeCaisse reel={452} />);
    expect(caisse()).toBe("452");
  });

  it("gelée : le solde d'ouverture tient, même si le réel monte", () => {
    const { rerender } = render(<SondeCaisse reel={132} />);
    act(() => gelerBudgetAffichage(132));
    rerender(<SondeCaisse reel={452} />);
    expect(caisse()).toBe("132");
  });

  it("le supplément est absolu : le reposer ne compte pas deux fois", () => {
    render(<SondeCaisse reel={452} />);
    act(() => gelerBudgetAffichage(132));
    act(() => poserSupplementBudget(120));
    expect(caisse()).toBe("252");
    act(() => poserSupplementBudget(120));
    expect(caisse()).toBe("252");
    act(() => poserSupplementBudget(180));
    expect(caisse()).toBe("312");
  });

  it("dégelée : le solde réel reprend la main, supplément oublié", () => {
    const { rerender } = render(<SondeCaisse reel={132} />);
    act(() => gelerBudgetAffichage(132));
    act(() => poserSupplementBudget(120));
    rerender(<SondeCaisse reel={452} />);
    act(() => degelerBudgetAffichage());
    expect(caisse()).toBe("452");
  });

  it("poser un supplément sans gel actif ne fait rien", () => {
    render(<SondeCaisse reel={452} />);
    act(() => poserSupplementBudget(120));
    expect(caisse()).toBe("452");
  });
});
