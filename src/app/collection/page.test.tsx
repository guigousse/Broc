// @vitest-environment jsdom
/**
 * En-tête de la page Collection.
 *
 * Retour device 2026-08-26 : le titre était centré (grille `1fr auto 1fr`),
 * ce qui n'accorde à la valeur de la collection qu'un tiers de la largeur —
 * elle s'y tronquait. Le titre passe à gauche, la valeur prend toute la
 * place restante à droite (mode `left` de `PageHeaderBar`).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CollectionPage from "./page";
import { CATEGORIES } from "@/data/categories";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/collection",
}));

const collectionVide = Object.fromEntries(CATEGORIES.map((c) => [c, []]));

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    isHydrated: true,
    state: {
      budget: 100,
      jetons: 0,
      collection: collectionVide,
      inventaireJoueur: [],
      brocanteur: { niveau: 1, xp: 0, pointsDisponibles: 0, competences: {} },
      niveauStockage: 1,
      competencesDebloquees: [],
      tutorielEtape: "termine",
    },
  }),
  useGameActions: () => ({ avancerTutoriel: vi.fn(), tempsConfiance: () => Date.now() }),
  useGameStateOnly: () => ({ state: null }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  useToastSafe: () => ({ toast: vi.fn() }),
}));

afterEach(cleanup);

describe("Collection — en-tête", () => {
  it("le titre est justifié à gauche, la valeur à droite", () => {
    render(<CollectionPage />);
    const titre = screen.getByText(/— COLLECTION —/i);
    const barre = titre.parentElement as HTMLElement;
    // Mode "left" de PageHeaderBar : deux zones poussées aux extrémités,
    // le titre EN PREMIER. Le mode "center" produisait une grille.
    expect(barre.style.display).toBe("flex");
    expect(barre.style.justifyContent).toBe("space-between");
    expect(barre.firstElementChild).toBe(titre);
  });

  it("la valeur de la collection occupe la zone de droite", () => {
    render(<CollectionPage />);
    const valeur = document.querySelector('[data-tuto-coach="collection-valeur"]');
    expect(valeur).not.toBeNull();
    const zone = valeur!.parentElement as HTMLElement;
    expect(zone.style.justifyContent).toBe("flex-end");
    const barre = zone.parentElement as HTMLElement;
    expect(barre.lastElementChild).toBe(zone);
  });
});
