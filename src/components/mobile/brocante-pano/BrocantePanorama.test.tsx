// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrocantePanorama } from "./BrocantePanorama";
import { BROCANTES } from "@/data/brocantes";
import type { GameState } from "@/types/game";

afterEach(cleanup);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const minimalState = {
  budget: 1000,
} as unknown as GameState;

describe("BrocantePanorama", () => {
  it("affiche le prompt vide au montage", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        decrireConditions={() => "raison"}
        destination="chiner"
      />,
    );
    expect(screen.getByText(/choisissez une brocante/i)).toBeTruthy();
  });

  it("met à jour le panneau détail au clic sur un cadre", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        decrireConditions={() => "raison"}
        destination="chiner"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /vide-grenier du quartier/i }));
    expect(screen.getByRole("heading", { name: /vide-grenier du quartier/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /entrer/i })).toBeTruthy();
  });

  it("affiche la raison de verrouillage quand la brocante n'est pas débloquée", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set()}
        decrireConditions={() => "Atteignez 30 € de valeur de collection."}
        destination="chiner"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /vide-grenier du quartier/i }));
    expect(screen.getByText(/atteignez 30 €/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: /fermé/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
