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

// BrocantePanorama consomme `useGameActions` pour attribuerVitrineABrocante,
// ajusterBudget, consommerEnergie et tempsConfiance. On stub : aucun test ne
// déclenche le flow d'attribution. `tempsConfiance` renvoie null → les sites
// retombent sur Date.now() (base gracieuse) ; minimalState a energie: 5.
vi.mock("@/context/GameContext", () => ({
  useGameActions: () => ({
    attribuerVitrineABrocante: vi.fn(),
    ajusterBudget: vi.fn(),
    consommerEnergie: vi.fn(),
    tempsConfiance: () => null,
  }),
}));

const minimalState = {
  budget: 1000,
  energie: 5,
  jourActuel: 0,
  historique: [],
  missions: [],
  brocanteur: { xp: 0, niveau: 0, pointsDisponibles: 0 },
  collection: {
    Musique: [],
    "Jeux & Loisirs": [],
    "Livres & Papeterie": [],
    Mode: [],
    Maison: [],
    "Objets d'art": [],
    Bricolage: [],
  },
} as unknown as GameState;

const noop = () => {};

describe("BrocantePanorama", () => {
  it("ne montre aucun détail au montage (rien sélectionné)", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        destination="chiner"
        onBack={noop}
      />,
    );
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("Continuer est désactivé tant qu'aucune brocante n'est sélectionnée", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        destination="chiner"
        onBack={noop}
      />,
    );
    const continuer = screen.getByRole("button", { name: /continuer/i }) as HTMLButtonElement;
    expect(continuer.disabled).toBe(true);
  });

  it("affiche le détail flottant et active Continuer au clic sur un cadre débloqué", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        destination="chiner"
        onBack={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /vide-grenier du quartier/i }));
    expect(screen.getByRole("heading", { name: /vide-grenier du quartier/i })).toBeTruthy();
    const continuer = screen.getByRole("button", { name: /continuer/i }) as HTMLButtonElement;
    expect(continuer.disabled).toBe(false);
  });

  it("affiche la liste des conditions et laisse Continuer désactivé pour une brocante fermée", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set()}
        destination="chiner"
        onBack={noop}
      />,
    );
    // marche-aux-puces-dimanche a `valeurCollection: 30`.
    // Collection vide (0) → condition non remplie, doit apparaître avec
    // texte "COLLECTION : 0/30 €".
    fireEvent.click(screen.getByRole("button", { name: /marché aux puces du dimanche/i }));
    expect(screen.getByText(/collection : 0\/30 €/i)).toBeTruthy();
    const continuer = screen.getByRole("button", { name: /continuer/i }) as HTMLButtonElement;
    expect(continuer.disabled).toBe(true);
  });

  it("appelle onBack au clic sur Retour", () => {
    const onBack = vi.fn();
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        destination="chiner"
        onBack={onBack}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /retour/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("réinitialise la sélection au snap vers un autre tier", async () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        destination="chiner"
        onBack={noop}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /vide-grenier du quartier/i }));
    expect(screen.queryByRole("heading", { name: /vide-grenier du quartier/i })).toBeTruthy();

    const scroller = document.querySelector('[aria-label="Panorama des brocantes"]') as HTMLDivElement;
    expect(scroller).toBeTruthy();
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 400 });
    scroller.scrollLeft = 400;
    fireEvent.scroll(scroller);

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    // Plus de heading visible → la sélection a été réinitialisée.
    expect(screen.queryByRole("heading", { name: /vide-grenier du quartier/i })).toBeNull();
  });
});
