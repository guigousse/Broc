// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrocanteDetailPanel } from "./BrocanteDetailPanel";
import type { Brocante } from "@/types/game";

afterEach(cleanup);

const brocante: Brocante = {
  id: "vide-grenier-quartier",
  nom: "Vide-grenier du quartier",
  description: "Quelques tables dépliées sur la place.",
  ambiance: "Familial",
  tier: 1,
  etoiles: 1,
  taillePool: 6,
  poolExclusif: [],
  conditionDeblocage: { type: "depart" },
};

describe("BrocanteDetailPanel", () => {
  it("affiche le prompt quand aucune brocante n'est sélectionnée", () => {
    render(
      <BrocanteDetailPanel
        brocante={null}
        debloquee={false}
        peutEntrer={false}
        raisonVerrouillage={null}
        onEntrer={() => {}}
      />,
    );
    expect(screen.getByText(/choisissez une brocante/i)).toBeTruthy();
  });

  it("affiche les infos quand une brocante est sélectionnée et débloquée", () => {
    const onEntrer = vi.fn();
    render(
      <BrocanteDetailPanel
        brocante={brocante}
        debloquee
        peutEntrer
        raisonVerrouillage={null}
        onEntrer={onEntrer}
      />,
    );
    expect(screen.getByText("Vide-grenier du quartier")).toBeTruthy();
    expect(screen.getByText(/quelques tables/i)).toBeTruthy();
    const btn = screen.getByRole("button", { name: /entrer/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(btn);
    expect(onEntrer).toHaveBeenCalled();
  });

  it("désactive le bouton et affiche la raison quand verrouillée", () => {
    render(
      <BrocanteDetailPanel
        brocante={brocante}
        debloquee={false}
        peutEntrer={false}
        raisonVerrouillage="Atteignez 30 € de valeur de collection."
        onEntrer={() => {}}
      />,
    );
    expect(screen.getByText(/atteignez 30 €/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: /fermé/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("affiche fonds insuffisants quand le budget est trop bas", () => {
    render(
      <BrocanteDetailPanel
        brocante={brocante}
        debloquee
        peutEntrer={false}
        raisonVerrouillage={null}
        onEntrer={() => {}}
      />,
    );
    expect((screen.getByRole("button", { name: /fonds insuffisants/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
