// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrocantePanorama } from "./BrocantePanorama";
import { TRANSITION_WIDTH_PX } from "./BrocanteTransition";
import { TIER_1_FRAMES, SCENE_FRAMES } from "./brocantePanoramaLayout";
import { BROCANTES } from "@/data/brocantes";
import type { GameState } from "@/types/game";

// jsdom n'implémente pas requestAnimationFrame — polyfill minimal.
globalThis.requestAnimationFrame ??= (cb) => setTimeout(() => cb(0), 0) as unknown as number;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// BrocantePanorama consomme `useGameActions` pour attribuerVitrineABrocante,
// ajusterBudget, consommerEnergie et tempsConfiance. Espions hoistés et
// partagés : le test du double-tap compte les débits. `tempsConfiance`
// renvoie null → les sites retombent sur Date.now() (base gracieuse) ;
// minimalState a energie: 5.
const { ajusterBudgetMock, consommerEnergieMock } = vi.hoisted(() => ({
  ajusterBudgetMock: vi.fn(),
  consommerEnergieMock: vi.fn(),
}));
vi.mock("@/context/GameContext", () => ({
  useGameActions: () => ({
    attribuerVitrineABrocante: vi.fn(),
    ajusterBudget: ajusterBudgetMock,
    consommerEnergie: consommerEnergieMock,
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

  /**
   * Audit 2026-08-03 (H2) : `onContinuer` (destination vitrine) débitait
   * frais d'entrée + énergie AVANT `router.push`, sans idempotence — un
   * double-tap pendant les ~280 ms de la navigation payait deux fois.
   */
  it("vitrine : un double-tap sur Continuer ne débite frais et énergie qu'une fois", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        destination="vitrine"
        onBack={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /vide-grenier du quartier/i }));
    const continuer = screen.getByRole("button", { name: /continuer/i });
    fireEvent.click(continuer);
    fireEvent.click(continuer);
    expect(ajusterBudgetMock).toHaveBeenCalledTimes(1);
    expect(consommerEnergieMock).toHaveBeenCalledTimes(1);
  });

  it("vitrine, coffre hors thème : les cadres spécialisés incompatibles sont cadenassés, pas les généraux", () => {
    const state = {
      ...minimalState,
      vitrine: { objets: [{ objet: { categorie: "Musique" }, prixVente: 10 }] },
    } as unknown as GameState;
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={state}
        debloqueesIds={new Set(["vide-grenier-quartier", "bouquinerie-plein-air"])}
        destination="vitrine"
        onBack={noop}
      />,
    );
    const cadenasDe = (nom: RegExp) =>
      screen.getByRole("button", { name: nom }).querySelector("[data-testid=cadre-cadenas]");
    expect(cadenasDe(/bouquinerie de plein air/i)).not.toBeNull();
    expect(cadenasDe(/vide-grenier du quartier/i)).toBeNull();
  });

  it("chiner : un coffre hors thème ne cadenasse rien", () => {
    const state = {
      ...minimalState,
      vitrine: { objets: [{ objet: { categorie: "Musique" }, prixVente: 10 }] },
    } as unknown as GameState;
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={state}
        debloqueesIds={new Set(["vide-grenier-quartier", "bouquinerie-plein-air"])}
        destination="chiner"
        onBack={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: /bouquinerie de plein air/i }).querySelector("[data-testid=cadre-cadenas]"),
    ).toBeNull();
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

  /**
   * Task 8 : le cadre de la braderie (événement) porte un badge « Événement »
   * — les autres cadres n'en portent pas. Toutes les scènes (tiers 1-4) sont
   * montées simultanément (scroll horizontal), donc le badge est cherchable
   * sans avoir à scroller dans ce test.
   */
  it("affiche le badge Événement sur le cadre de la braderie et nulle part ailleurs", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        destination="chiner"
        onBack={noop}
      />,
    );
    expect(screen.getAllByText("Événement")).toHaveLength(1);
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
    // La braderie est dans BROCANTES → scènes = [evenement, 1, 2, 3, 4].
    // On snappe sur l'index 2 (tier 2) : offset exact = idx × (largeur + filler).
    scroller.scrollLeft = 2 * (400 + TRANSITION_WIDTH_PX);
    fireEvent.scroll(scroller);

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    // Plus de heading visible → la sélection a été réinitialisée.
    expect(screen.queryByRole("heading", { name: /vide-grenier du quartier/i })).toBeNull();
  });

  /**
   * Task 3 : la braderie a sa propre scène ("evenement") — son cadre quitte
   * TIER_1_FRAMES et la 5ᵉ plaque (Megaphone) n'apparaît que si elle est
   * présente dans la liste de brocantes.
   */
  it("avec la braderie : 5 plaques (dont Événement) et cadre braderie hors scène 1", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        destination="chiner"
        onBack={noop}
      />,
    );
    expect(screen.getAllByRole("button", { name: /événement/i }).length).toBeGreaterThanOrEqual(1);
    // Le cadre braderie n'est plus dans TIER_1_FRAMES :
    expect(TIER_1_FRAMES.some((f) => f.id === "grande-braderie")).toBe(false);
    expect(SCENE_FRAMES.evenement.some((f) => f.id === "grande-braderie")).toBe(true);
  });

  it("sans la braderie : 4 plaques, pas de plaque Événement", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES.filter((b) => b.id !== "grande-braderie")}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        destination="chiner"
        onBack={noop}
      />,
    );
    expect(screen.queryByRole("button", { name: /événement/i })).toBeNull();
  });
});
