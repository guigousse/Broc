// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrocantePanorama } from "./BrocantePanorama";
import { BROCANTES } from "@/data/brocantes";
import type { GameState } from "@/types/game";

// jsdom n'implémente pas requestAnimationFrame — polyfill minimal.
globalThis.requestAnimationFrame ??= (cb) => setTimeout(() => cb(0), 0) as unknown as number;

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

  it("réinitialise la sélection au snap vers un autre tier", async () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        decrireConditions={() => "raison"}
        destination="chiner"
      />,
    );

    // Sélectionne une brocante du tier 1
    fireEvent.click(screen.getByRole("button", { name: /vide-grenier du quartier/i }));
    expect(screen.queryByRole("heading", { name: /vide-grenier du quartier/i })).toBeTruthy();

    // Simule un snap vers le tier 2 : largeur de scène = clientWidth, on positionne
    // scrollLeft = clientWidth pour atterrir sur la 2ème scène.
    const scroller = document.querySelector('[aria-label="Panorama des brocantes"]') as HTMLDivElement;
    expect(scroller).toBeTruthy();
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 400 });
    scroller.scrollLeft = 400;
    fireEvent.scroll(scroller);

    // Laisse passer le rAF qu'utilise le listener.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    // La sélection doit avoir été réinitialisée → prompt vide.
    expect(screen.getByText(/choisissez une brocante/i)).toBeTruthy();
  });
});
